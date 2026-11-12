import { zValidator } from "@console/core/error";
import * as App from "@console/core/app";
import * as State from "@console/core/state";
import { Hono } from "hono";

import {
	AppListQuerySchema,
	AppNameParamSchema,
	StageParamSchema,
	StageUpdateParamSchema
} from "./schemas/app.schemas";

export const appRoutes = new Hono()
	.get("/", zValidator("query", AppListQuerySchema), async c =>
		c.json(await App.list(c.req.valid("query")))
	)
	.get(
		"/:appName/stages/:stageName/updates",
		zValidator("param", StageParamSchema),
		async c => {
			const input = c.req.valid("param");
			await App.Stage.get(input);
			return c.json(await State.Update.list(input));
		}
	)
	.get(
		"/:appName/stages/:stageName/updates/:updateId",
		zValidator("param", StageUpdateParamSchema),
		async c => {
			const input = c.req.valid("param");
			await App.Stage.get(input);
			const update = await State.Update.get(input);
			if (!update) throw State.stateErrors.updateNotFound();
			const [snapshot, eventLog, events] = await Promise.all([
				State.Snapshot.get(input),
				State.EventLog.get(input),
				State.StateEvent.list(input)
			]);
			return c.json({ update, snapshot, eventLog, events });
		}
	)
	.get(
		"/:appName/stages/:stageName",
		zValidator("param", StageParamSchema),
		async c => c.json(await App.inspectStage(c.req.valid("param")))
	)
	.get("/:appName", zValidator("param", AppNameParamSchema), async c =>
		c.json(await App.inspect(c.req.valid("param")))
	);
