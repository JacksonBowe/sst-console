import { z } from "zod";

import { db } from "../db";
import { ServerError } from "../error";
import { fn } from "../util/fn";

const maxTransactionActions = 90;

// Public State contract carries only its S3 locator and observation metadata.
// It is never a transport for raw checkpoint data.
export const StateKeySchema = z.object({
	appName: z.string().min(1),
	stageName: z.string().min(1)
});

export const StateSchema = StateKeySchema.extend({
	accountId: z.string().regex(/^\d{12}$/),
	sourceBucket: z.string().min(1),
	sourceKey: z.string().min(1),
	sourceVersion: z.string().min(1).optional(),
	observedAt: z.iso.datetime()
});

export type State = z.infer<typeof StateSchema>;

// Current State is mutable because SST repeatedly writes app/{app}/{stage}.json.
export const upsert = fn(StateSchema, async input => {
	await db.entities.state.upsert(input).go({ response: "none" });
});

// Reads current source metadata only; callers fetch raw State from S3 when needed.
export const get = fn(StateKeySchema, async input => {
	const result = await db.entities.state.get(input).go({ consistent: true });
	return result.data ? StateSchema.parse(result.data) : null;
});

/** Deletes all persisted State projections for one Stage. */
export const removeStageHistory = fn(StateKeySchema, async input => {
	const updates = await db.entities.stateUpdate.query
		.history(input)
		.go({ pages: "all" });
	for (const chunk of chunkArray(updates.data, maxTransactionActions)) {
		const transaction = await db.transaction
			.write(({ stateUpdate }) =>
				chunk.map(update =>
					stateUpdate
						.delete({
							appName: update.appName,
							stageName: update.stageName,
							updateId: update.updateId
						})
						.commit()
				)
			)
			.go();
		if (transaction.canceled)
			throw new ServerError(
				"state_history_removal_failed",
				"Unable to remove State Update history"
			);
	}
	await db.entities.state.delete(input).go({ response: "none" });
});

function chunkArray<T>(items: T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let index = 0; index < items.length; index += size)
		chunks.push(items.slice(index, index + size));
	return chunks;
}
