import { StageKeySchema } from "@console/core/app";
import { zValidator } from "@console/core/error";
import * as Issue from "@console/core/issue";
import { Hono } from "hono";
import { z } from "zod";

export const issueRoutes = new Hono();

const IssueKeySchema = StageKeySchema.extend({
	fingerprint: z.string().min(1)
});
const IssueListSchema = z.object({
	appName: z.string().min(1).optional(),
	stageName: z.string().min(1).optional(),
	status: Issue.IssueStatusSchema.optional()
});
const IssueStatusSchema = z.object({ status: Issue.IssueStatusSchema });

/** Lists Issues for dashboard navigation and optional App, Stage, or status scope. */
issueRoutes.get("/", zValidator("query", IssueListSchema), async c =>
	c.json(await Issue.list(c.req.valid("query")))
);

/** Deletes all persisted Issues without changing stage monitoring. */
issueRoutes.delete("/", async c => {
	await Issue.purge();
	return c.body(null, 204);
});

/** Disables Issue monitoring for every Stage with monitoring enabled. */
issueRoutes.post("/monitoring/disable", async c =>
	c.json(await Issue.Monitoring.disableAllStages())
);

/** Returns monitoring state, subscription state, and current Issues for one stage. */
issueRoutes.get(
	"/:appName/:stageName",
	zValidator("param", StageKeySchema),
	async c =>
		c.json(await Issue.Monitoring.getStageStatus(c.req.valid("param")))
);

/** Triggers a controlled API error for Issue monitoring verification. */
issueRoutes.post("/test", async _c => {
	console.error("SST Console Issue test");
	throw new Error("SST Console Issue test error");
});

/** Changes one Issue lifecycle state. */
issueRoutes.post(
	"/:appName/:stageName/:fingerprint/status",
	zValidator("param", IssueKeySchema),
	zValidator("json", IssueStatusSchema),
	async c => {
		await Issue.setStatus({
			...c.req.valid("param"),
			status: c.req.valid("json").status
		});
		return c.body(null, 204);
	}
);
/** Enables stage monitoring and queues targeted reconciliation. */
issueRoutes.post(
	"/:appName/:stageName/connect",
	zValidator("param", StageKeySchema),
	async c => {
		await Issue.Monitoring.enableStage(c.req.valid("param"));
		return c.body(null, 204);
	}
);
/** Disables stage monitoring and queues owned-filter removal. */
issueRoutes.post(
	"/:appName/:stageName/disconnect",
	zValidator("param", StageKeySchema),
	async c => {
		await Issue.Monitoring.disableStage(c.req.valid("param"));
		return c.body(null, 204);
	}
);
