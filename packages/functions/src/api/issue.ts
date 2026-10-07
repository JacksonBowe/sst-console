import { StageSchema } from "@console/core/app";
import { zValidator } from "@console/core/error";
import * as Issue from "@console/core/issue";
import { Hono } from "hono";

export const issueRoutes = new Hono();

/** Deletes all persisted Issues without changing stage monitoring. */
issueRoutes.delete("/", async c => {
	await Issue.purge();
	return c.body(null, 204);
});

/** Returns monitoring state, subscription state, and current Issues for one stage. */
issueRoutes.get(
	"/:appName/:stageName",
	zValidator("param", StageSchema),
	async c =>
		c.json(await Issue.Monitoring.getStageStatus(c.req.valid("param")))
);

/** Confirms temporary Issue API controls are reachable. */
issueRoutes.post("/test-query", async c => {
	console.error("This a test console.log error");
	return c.json({ message: "Issue test route is working" });
});
/** Enables stage monitoring and queues targeted reconciliation. */
issueRoutes.post(
	"/:appName/:stageName/connect",
	zValidator("param", StageSchema),
	async c => {
		await Issue.Monitoring.enableStage(c.req.valid("param"));
		return c.body(null, 204);
	}
);
/** Disables stage monitoring and queues owned-filter removal. */
issueRoutes.post(
	"/:appName/:stageName/disconnect",
	zValidator("param", StageSchema),
	async c => {
		await Issue.Monitoring.disableStage(c.req.valid("param"));
		return c.body(null, 204);
	}
);
