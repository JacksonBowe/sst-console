import { z } from "zod";
import { defineEvent } from "../event";

import { StageKeySchema } from "../app";
import { db } from "../db";
import { fn } from "../util/fn";
import { issueErrors } from "./errors";

const IssueKeySchema = StageKeySchema.extend({
	fingerprint: z.string().min(1)
});

export const IssueStatusSchema = z.enum(["open", "resolved", "suppressed"]);

export const IssueSchema = IssueKeySchema.extend({
	accountId: z.string().min(1),
	region: z.string().min(1),
	functionArn: z.string().min(1).optional(),
	functionName: z.string().min(1).optional(),
	errorType: z.string().min(1),
	errorMessage: z.string().min(1),
	stack: z.string().min(1).optional(),
	status: IssueStatusSchema,
	statusUpdatedAt: z.iso.datetime(),
	count: z.number().int().min(1),
	firstSeenAt: z.iso.datetime(),
	lastSeenAt: z.iso.datetime(),
	logGroup: z.string().min(1),
	logStream: z.string(),
	logTimestamp: z.number().int()
});

export type Issue = z.infer<typeof IssueSchema>;

export const Events = {
	Created: defineEvent("issue.created", z.object({ issue: IssueSchema })),
	Updated: defineEvent("issue.updated", z.object({ issue: IssueSchema }))
};

const ListSchema = z.object({
	appName: z.string().min(1).optional(),
	stageName: z.string().min(1).optional(),
	status: IssueStatusSchema.optional()
});

/** Creates one grouped Issue record. */
export const create = fn(IssueSchema, async input => {
	await db.entities.issue.create(input).go({ response: "none" });
});

async function getRecord(input: z.infer<typeof IssueKeySchema>) {
	const result = await db.entities.issue.get(input).go({ consistent: true });
	return result.data ? IssueSchema.parse(result.data) : null;
}

/** Finds one Issue by stage and fingerprint. */
export const find = fn(IssueKeySchema, getRecord);

/** Gets one Issue by stage and fingerprint or throws when it does not exist. */
export const get = fn(IssueKeySchema, async input => {
	const issue = await getRecord(input);
	if (!issue) throw issueErrors.notFound();
	return issue;
});

/** Lists persisted Issues, optionally scoped to an App, Stage, or lifecycle state. */
export const list = fn(ListSchema, async input => {
	const result = input.appName
		? await db.entities.issue.query
				.byType({})
				.begins({
					appName: input.appName,
					...(input.stageName ? { stageName: input.stageName } : {})
				})
				.go({ pages: "all", order: "desc" })
		: await db.entities.issue.query.byType({}).go({ pages: "all" });
	return result.data
		.map(issue => IssueSchema.parse(issue))
		.filter(
			issue => !input.stageName || issue.stageName === input.stageName
		)
		.filter(issue => !input.status || issue.status === input.status);
});

/** Updates mutable Issue fields. Use `countDelta` for atomic occurrence counts. */
export const update = fn(
	IssueKeySchema.extend({
		functionArn: z.string().min(1).nullable().optional(),
		functionName: z.string().min(1).nullable().optional(),
		errorType: z.string().min(1).optional(),
		errorMessage: z.string().min(1).optional(),
		stack: z.string().min(1).nullable().optional(),
		status: IssueStatusSchema.optional(),
		statusUpdatedAt: z.iso.datetime().optional(),
		count: z.number().int().min(1).optional(),
		countDelta: z.number().int().optional(),
		firstSeenAt: z.iso.datetime().optional(),
		lastSeenAt: z.iso.datetime().optional(),
		logGroup: z.string().min(1).optional(),
		logStream: z.string().optional(),
		logTimestamp: z.number().int().optional()
	})
		.refine(
			input =>
				input.functionArn !== undefined ||
				input.functionName !== undefined ||
				input.errorType !== undefined ||
				input.errorMessage !== undefined ||
				input.stack !== undefined ||
				input.status !== undefined ||
				input.statusUpdatedAt !== undefined ||
				input.count !== undefined ||
				input.countDelta !== undefined ||
				input.firstSeenAt !== undefined ||
				input.lastSeenAt !== undefined ||
				input.logGroup !== undefined ||
				input.logStream !== undefined ||
				input.logTimestamp !== undefined,
			"At least one Issue field must be updated"
		)
		.refine(
			input =>
				!(input.count !== undefined && input.countDelta !== undefined),
			"count and countDelta cannot both be updated"
		),
	async ({
		appName,
		stageName,
		fingerprint,
		countDelta,
		functionArn,
		functionName,
		stack,
		...changes
	}) => {
		const fields = {
			...changes,
			...(functionArn === undefined
				? {}
				: { functionArn: functionArn ?? undefined }),
			...(functionName === undefined
				? {}
				: { functionName: functionName ?? undefined }),
			...(stack === undefined ? {} : { stack: stack ?? undefined })
		};
		let operation = db.entities.issue
			.patch({ appName, stageName, fingerprint })
			.set(fields);
		if (countDelta !== undefined)
			operation = operation.add({ count: countDelta });
		await operation.go({ response: "none" });
	}
);

/** Changes Issue lifecycle state without changing its occurrence history. */
export const setStatus = fn(
	IssueKeySchema.extend({ status: IssueStatusSchema }),
	async ({ appName, stageName, fingerprint, status }) => {
		await update({
			appName,
			stageName,
			fingerprint,
			status,
			statusUpdatedAt: new Date().toISOString()
		});
	}
);

/** Deletes one Issue by stage and fingerprint. */
export const remove = fn(IssueKeySchema, async input => {
	await db.entities.issue.delete(input).go({ response: "none" });
});

/** Deletes every persisted Issue without changing monitoring configuration. */
export async function purge() {
	const issues = await list({});
	for (const issue of issues) await remove(issue);
}
