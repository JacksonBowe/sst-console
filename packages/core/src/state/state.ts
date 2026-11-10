import { AccountIdSchema } from "../util/aws";
import { z } from "zod";
import { Resource } from "sst";
import { bus } from "sst/aws/bus";

import { db } from "../db";
import { fn } from "../util/fn";
import * as Account from "../account/account";
import * as Connection from "../connection";
import * as Stage from "../app/app.stage";

import { StateKeySchema } from "./schema";
import * as Update from "./update";
import * as Snapshot from "./snapshot";
import * as EventLog from "./event-log";
import * as StateEvent from "./resource-event";
import { stateErrors } from "./errors";
import { Events } from "./events";

export { StateKeySchema } from "./schema";

// Public State contract carries only its S3 locator and observation metadata.
// It is never a transport for raw checkpoint data.
export const StateSchema = StateKeySchema.extend({
	accountId: AccountIdSchema,
	sourceBucket: z.string().min(1),
	sourceKey: z.string().min(1),
	sourceVersion: z.string().min(1).optional(),
	observedAt: z.iso.datetime()
});

export type State = z.infer<typeof StateSchema>;

// Current State is mutable because SST repeatedly writes app/{app}/{stage}.json.
/** Upserts the locator and observation metadata for current State. */
export const upsert = fn(StateSchema, async input => {
	await db.entities.state.upsert(input).go({ response: "none" });
});

// Reads current source metadata only; callers fetch raw State from S3 when needed.
/** Reads current State source metadata without fetching the artifact from S3. */
export const get = fn(StateKeySchema, async input => {
	const result = await db.entities.state.get(input).go({ consistent: true });
	return result.data ? StateSchema.parse(result.data) : null;
});

/** Publish the normal ingestion events for one discovered historical Update. */
export const processHistory = fn(
	StateKeySchema.extend({
		accountId: AccountIdSchema,
		updateId: z.string().min(1)
	}),
	async ({ accountId, appName, stageName, updateId }) => {
		const key = { appName, stageName, updateId };
		const account = await Account.find({ accountId });
		if (account?.status !== "connected" || !account.stateBucket)
			throw stateErrors.backfillBucketMissing();
		const policy = await Connection.getSyncPolicy(accountId);
		await Stage.assertStageOwnership({ accountId, appName, stageName });
		if (!Connection.Policy.includesStage(policy, key))
			throw stateErrors.stageNotTracked();
		const [update, snapshot, eventLog] = await Promise.all([
			Update.get(key),
			Snapshot.get(key),
			EventLog.get(key)
		]);
		const stateBucket = account.stateBucket;
		let published = 0;
		// TODO: Attempt each publication independently if another publication fails.
		if (update?.sourceBucket === stateBucket) {
			await bus.publish(Resource.Bus, Events.UpdateCreated, {
				accountId,
				stateBucket,
				stateKey: update.sourceKey,
				historical: true
			});
			published++;
		}
		if (snapshot?.sourceBucket === stateBucket) {
			await bus.publish(Resource.Bus, Events.SnapshotCreated, {
				accountId,
				stateBucket,
				stateKey: snapshot.sourceKey
			});
			published++;
		}
		if (eventLog?.sourceBucket === stateBucket) {
			await bus.publish(Resource.Bus, Events.EventLogCreated, {
				accountId,
				stateBucket,
				stateKey: eventLog.sourceKey
			});
			published++;
		}
		return { published };
	}
);

/** Deletes all persisted State projections for one Stage. */
export const removeStageHistory = fn(StateKeySchema, async input => {
	await StateEvent.removeStage(input);
	await Snapshot.remove(input);
	await EventLog.remove(input);
	await Update.remove(input);
	await db.entities.state.delete(input).go({ response: "none" });
});
