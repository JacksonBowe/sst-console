import { zValidator } from "@console/core/error";
import * as Account from "@console/core/account";
import { AccountSyncPolicySchema } from "@console/core/account";
import { Hono } from "hono";
import { z } from "zod";

const AccountIdParamSchema = z.object({
	accountId: z.string().regex(/^\d{12}$/)
});

const StateResourcesParamSchema = AccountIdParamSchema.extend({
	appName: z.string().min(1),
	stageName: z.string().min(1)
});

const AccountSyncPolicyJsonSchema = z.object({
	policy: AccountSyncPolicySchema
});

export const accountRoutes = new Hono()
	.get("/", async c => c.json(await Account.list()))
	.post("/backup-connections", async c =>
		c.json(await Account.backupConnections({}))
	)
	.post("/recover", async c => c.json(await Account.recover({})))
	.get(
		"/:accountId/manage-apps",
		zValidator("param", AccountIdParamSchema),
		async c => c.json(await Account.manageApps(c.req.valid("param")))
	)
	.post(
		"/:accountId/discovery",
		zValidator("param", AccountIdParamSchema),
		async c => c.json(await Account.refreshDiscovery(c.req.valid("param")))
	)
	.put(
		"/:accountId/sync-policy",
		zValidator("param", AccountIdParamSchema),
		zValidator("json", AccountSyncPolicyJsonSchema),
		async c =>
			c.json(
				await Account.updateSyncPolicy({
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
				await Account.applySyncPolicy({
					...c.req.valid("param"),
					...c.req.valid("json")
				})
			)
	)
	.get("/:accountId", zValidator("param", AccountIdParamSchema), async c =>
		c.json(await Account.inspect(c.req.valid("param")))
	)
	.get(
		"/:accountId/state/:appName/:stageName/resources",
		zValidator("param", StateResourcesParamSchema),
		async c => c.json(await Account.inspectState(c.req.valid("param")))
	)
	.post(
		"/:accountId/sync",
		zValidator("param", AccountIdParamSchema),
		async c => c.json(await Account.sync(c.req.valid("param")))
	);
