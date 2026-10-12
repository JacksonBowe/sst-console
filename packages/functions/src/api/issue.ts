import * as Account from "@console/core/account";
import * as App from "@console/core/app";
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
const MonitoringSchema = z.object({ enabled: z.boolean() });
const IssueSeedSchema = z.object({
	count: z.coerce.number().int().min(1).max(100).default(25)
});
const issueStatuses = ["open", "resolved", "suppressed"] as const;
const issueErrorTypes = [
	"ConsoleError",
	"LambdaTimeoutError",
	"LambdaRuntimeError"
] as const;

/** Lists Issues for dashboard navigation and optional App, Stage, or status scope. */
issueRoutes.get("/", zValidator("query", IssueListSchema), async c =>
	c.json(await Issue.list(c.req.valid("query")))
);

/** Deletes all persisted Issues without changing stage monitoring. */
issueRoutes.delete("/", async c => {
	await Issue.purge();
	return c.body(null, 204);
});

/** Returns monitoring state, subscription state, and current Issues for one stage. */
issueRoutes.get(
	"/:appName/:stageName",
	zValidator("param", StageKeySchema),
	async c =>
		c.json(await Issue.Monitoring.getStageStatus(c.req.valid("param")))
);

/** Confirms temporary Issue API controls are reachable. */
issueRoutes.post("/test-query", async c => {
	console.error("SST Console Issue test query");
	return c.json({ message: "Issue test route is working" });
});

/** Seeds test Issues across connected Stages for frontend development. */
issueRoutes.post("/test-seed", zValidator("json", IssueSeedSchema), async c => {
	const connectedAccountIds = new Set(
		(await Account.list())
			.filter(account => account.status === "connected")
			.map(account => account.accountId)
	);
	const apps = await App.list({ summaries: false });
	const appSummaries = await Promise.all(
		apps.map(app => App.summary({ appName: app.appName }))
	);
	const stages = appSummaries.flatMap(app =>
		app.stages
			.map(stage => ({ ...stage, appName: app.appName }))
			.filter(stage => connectedAccountIds.has(stage.accountId))
	);
	if (stages.length === 0)
		return c.json(
			{ message: "No Stages exist for connected accounts" },
			400
		);

	const now = Date.now();
	const issues = Array.from(
		{ length: c.req.valid("json").count },
		(_, index) => {
			const stage = stages[index % stages.length]!;
			const occurredAt = new Date(now - index * 60_000).toISOString();
			const functionName = `seeded-issue-${index + 1}`;
			return {
				appName: stage.appName,
				stageName: stage.stageName,
				fingerprint: `test-${crypto.randomUUID()}`,
				accountId: stage.accountId,
				region: stage.region,
				functionArn: `arn:aws:lambda:${stage.region}:${stage.accountId}:function:${functionName}`,
				functionName,
				errorType: issueErrorTypes[index % issueErrorTypes.length]!,
				errorMessage: `Seeded test Issue ${index + 1}`,
				stack: `Error: Seeded test Issue ${index + 1}\n    at seedIssues`,
				status: issueStatuses[index % issueStatuses.length]!,
				statusUpdatedAt: occurredAt,
				count: index + 1,
				firstSeenAt: occurredAt,
				lastSeenAt: occurredAt,
				logGroup: `/aws/lambda/${functionName}`,
				logStream: `seeded-${index + 1}`,
				logTimestamp: now - index * 60_000
			};
		}
	);
	await Promise.all(issues.map(issue => Issue.create(issue)));
	return c.json({ issues });
});

/** Enables or disables monitoring for every current Stage in one App. */
issueRoutes.post(
	"/apps/:appName/monitoring",
	zValidator("param", StageKeySchema.pick({ appName: true })),
	zValidator("json", MonitoringSchema),
	async c => {
		await Issue.Monitoring.setAppEnabled({
			appName: c.req.valid("param").appName,
			enabled: c.req.valid("json").enabled
		});
		return c.body(null, 204);
	}
);

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
