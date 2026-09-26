import { zValidator } from "@console/core/error";
import * as App from "@console/core/app";
import { Hono } from "hono";
import { z } from "zod";

const AppNameParamSchema = z.object({ appName: z.string().min(1) });
const StageParamSchema = AppNameParamSchema.extend({
	stageName: z.string().min(1)
});

export const appRoutes = new Hono()
	.get("/", async c => c.json(await App.list()))
	.get(
		"/:appName/stages/:stageName",
		zValidator("param", StageParamSchema),
		async c => c.json(await App.inspectStage(c.req.valid("param")))
	)
	.get("/:appName", zValidator("param", AppNameParamSchema), async c =>
		c.json(await App.inspect(c.req.valid("param")))
	);
