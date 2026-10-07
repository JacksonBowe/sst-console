import { zValidator } from "@console/core/error";
import * as App from "@console/core/app";
import { Hono } from "hono";

import {
	AppListQuerySchema,
	AppNameParamSchema,
	StageParamSchema
} from "./schemas/app.schemas";

export const appRoutes = new Hono()
	.get("/", zValidator("query", AppListQuerySchema), async c =>
		c.json(await App.list(c.req.valid("query")))
	)
	.get(
		"/:appName/stages/:stageName",
		zValidator("param", StageParamSchema),
		async c => c.json(await App.inspectStage(c.req.valid("param")))
	)
	.get("/:appName", zValidator("param", AppNameParamSchema), async c =>
		c.json(await App.inspect(c.req.valid("param")))
	);
