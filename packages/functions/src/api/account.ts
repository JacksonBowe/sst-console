import { zValidator } from "@console/core/error";
import * as Account from "@console/core/account";
import { Hono } from "hono";
import { z } from "zod";

const AccountIdParamSchema = z.object({
	accountId: z.string().regex(/^\d{12}$/)
});

const StateResourcesParamSchema = AccountIdParamSchema.extend({
	appName: z.string().min(1),
	stageName: z.string().min(1)
});

export const accountRoutes = new Hono()
	.get("/", async c => c.json(await Account.list()))
	.post("/backup-connections", async c =>
		c.json(await Account.backupConnections({}))
	)
	.post("/recover", async c => c.json(await Account.recover({})))
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
