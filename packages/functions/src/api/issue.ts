import { zValidator } from "@console/core/error";
import * as IssueIngress from "@console/core/issue/ingress";
import { Hono } from "hono";
import { z } from "zod";

export const issueRoutes = new Hono();

const stageSchema = z.object({
	appName: z.string().min(1),
	stageName: z.string().min(1)
});

/** Deletes all persisted Issues without changing stage monitoring. */
issueRoutes.delete("/", async c => {
	await IssueIngress.deleteAllIssues();
	return c.body(null, 204);
});

/** Returns monitoring state, subscription state, and current Issues for one stage. */
issueRoutes.get(
	"/:appName/:stageName",
	zValidator("param", stageSchema),
	async c => c.json(await IssueIngress.getStageStatus(c.req.valid("param")))
);

/** Confirms temporary Issue API controls are reachable. */
issueRoutes.post("/test-query", async c => {
	console.error("This a test console.log error");
	return c.json({ message: "Issue test route is working" });
});
/** Enables stage monitoring and queues targeted reconciliation. */
issueRoutes.post(
	"/:appName/:stageName/connect",
	zValidator("param", stageSchema),
	async c => {
		await IssueIngress.enableStage(c.req.valid("param"));
		return c.body(null, 204);
	}
);
/** Disables stage monitoring and queues owned-filter removal. */
issueRoutes.post(
	"/:appName/:stageName/disconnect",
	zValidator("param", stageSchema),
	async c => {
		await IssueIngress.disableStage(c.req.valid("param"));
		return c.body(null, 204);
	}
);
