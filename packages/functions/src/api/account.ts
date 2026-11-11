import { AccountIdSchema } from "@console/core/util/aws";
import { zValidator } from "@console/core/error";
import * as Account from "@console/core/account";
import * as Connection from "@console/core/connection";
import * as State from "@console/core/state";
import { Stage } from "@console/core/app";
import { AccountSyncPolicySchema } from "@console/core/connection";
import { Hono } from "hono";
import { z } from "zod";

const AccountIdParamSchema = z.object({
	accountId: AccountIdSchema
});

const StateResourcesParamSchema = AccountIdParamSchema.extend({
	appName: z.string().min(1),
	stageName: z.string().min(1)
});

const StateBackfillParamSchema = AccountIdParamSchema.extend({
	appName: z
		.string()
		.min(1)
		.regex(/^[^/]+$/),
	stageName: z
		.string()
		.min(1)
		.regex(/^[^/]+$/)
});

const StateProcessParamSchema = StateBackfillParamSchema.extend({
	updateId: z.string().min(1)
});

const AccountSyncPolicyJsonSchema = z.object({
	policy: AccountSyncPolicySchema
});

function discoveryResponse<
	T extends {
		states: Array<{
			appName: string;
			stageName: string;
			key: string;
			lastModified?: string;
			size?: number;
			etag?: string;
		}>;
	}
>(result: T) {
	return {
		...result,
		states: result.states.map(({ appName, stageName, ...metadata }) => ({
			app: appName,
			stage: stageName,
			...metadata
		}))
	};
}

export const accountRoutes = new Hono()
	.get("/", async c => c.json(await Account.list()))
	.post("/backup-connections", async c =>
		c.json(await Connection.Recovery.backupConnections({}))
	)
	.post("/recover", async c => c.json(await Connection.Recovery.recover({})))
	.get(
		"/:accountId/manage-apps",
		zValidator("param", AccountIdParamSchema),
		async c =>
			c.json(await Account.Management.manageApps(c.req.valid("param")))
	)
	.post(
		"/:accountId/discovery",
		zValidator("param", AccountIdParamSchema),
		async c =>
			c.json(
				discoveryResponse(
					await State.discover(c.req.valid("param").accountId)
				)
			)
	)
	.put(
		"/:accountId/sync-policy",
		zValidator("param", AccountIdParamSchema),
		zValidator("json", AccountSyncPolicyJsonSchema),
		async c =>
			c.json(
				await Account.Management.updateSyncPolicy({
					...c.req.valid("param"),
					...c.req.valid("json")
				})
			)
	)
	.post(
		"/:accountId/sync-policy/apply",
		zValidator("param", AccountIdParamSchema),
		zValidator("json", AccountSyncPolicyJsonSchema),
		async c =>
			c.json(
				discoveryResponse(
					await Account.Management.applySyncPolicy({
						...c.req.valid("param"),
						...c.req.valid("json")
					})
				)
			)
	)
	.get("/:accountId", zValidator("param", AccountIdParamSchema), async c =>
		c.json(await Account.get(c.req.valid("param")))
	)
	.get(
		"/:accountId/state/:appName/:stageName/resources",
		zValidator("param", StateResourcesParamSchema),
		async c => c.json(await State.inspectState(c.req.valid("param")))
	)
	.post(
		"/:accountId/state/:appName/:stageName/backfill",
		zValidator("param", StateBackfillParamSchema),
		async c => c.json(await State.backfill(c.req.valid("param")))
	)
	.get(
		"/:accountId/state/:appName/:stageName/updates",
		zValidator("param", StateBackfillParamSchema),
		async c => {
			const input = c.req.valid("param");
			await Stage.assertStageOwnership(input);
			return c.json(await State.Update.list(input));
		}
	)
	.post(
		"/:accountId/state/:appName/:stageName/updates/:updateId/process",
		zValidator("param", StateProcessParamSchema),
		async c => c.json(await State.processHistory(c.req.valid("param")))
	)
	.get(
		"/:accountId/state/:appName/:stageName/updates/:updateId/events",
		zValidator("param", StateProcessParamSchema),
		async c => {
			const input = c.req.valid("param");
			await Stage.assertStageOwnership(input);
			return c.json(await State.StateEvent.list(input));
		}
	)
	.get(
		"/:accountId/state/:appName/:stageName/snapshots",
		zValidator("param", StateBackfillParamSchema),
		async c => {
			const input = c.req.valid("param");
			await Stage.assertStageOwnership(input);
			return c.json(await State.Snapshot.list(input));
		}
	)
	.get(
		"/:accountId/state/:appName/:stageName/event-logs",
		zValidator("param", StateBackfillParamSchema),
		async c => {
			const input = c.req.valid("param");
			await Stage.assertStageOwnership(input);
			return c.json(await State.EventLog.list(input));
		}
	)
	.post(
		"/:accountId/sync",
		zValidator("param", AccountIdParamSchema),
		async c =>
			c.json(
				discoveryResponse(await Account.Sync.sync(c.req.valid("param")))
			)
	);
