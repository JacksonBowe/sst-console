import { z } from "zod";

import { StageKeySchema } from "../app";
import { db } from "../db";
import { fn } from "../util/fn";
import { issueErrors } from "./errors";

const IssueKeySchema = StageKeySchema.extend({
	fingerprint: z.string().min(1)
});

export const IssueSchema = IssueKeySchema.extend({
	error: z.string().min(1),
	message: z.string().min(1),
	count: z.number().int().min(1),
	firstSeenAt: z.iso.datetime(),
	lastSeenAt: z.iso.datetime(),
	logGroup: z.string().min(1),
	logStream: z.string(),
	logTimestamp: z.number().int(),
	resolvedAt: z.iso.datetime().optional()
});

export type Issue = z.infer<typeof IssueSchema>;

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

/** Lists every Issue recorded for one stage. */
export const list = fn(StageKeySchema, async input => {
	const result = await db.entities.issue.query
		.stage(input)
		.go({ pages: "all" });
	return result.data.map(issue => IssueSchema.parse(issue));
});

/** Updates mutable Issue fields. Use `countDelta` for atomic occurrence counts. */
export const update = fn(
	IssueKeySchema.extend({
		error: z.string().min(1).optional(),
		message: z.string().min(1).optional(),
		count: z.number().int().min(1).optional(),
		countDelta: z.number().int().optional(),
		firstSeenAt: z.iso.datetime().optional(),
		lastSeenAt: z.iso.datetime().optional(),
		logGroup: z.string().min(1).optional(),
		logStream: z.string().optional(),
		logTimestamp: z.number().int().optional(),
		resolvedAt: z.iso.datetime().nullable().optional()
	})
		.refine(
			input =>
				input.error !== undefined ||
				input.message !== undefined ||
				input.count !== undefined ||
				input.countDelta !== undefined ||
				input.firstSeenAt !== undefined ||
				input.lastSeenAt !== undefined ||
				input.logGroup !== undefined ||
				input.logStream !== undefined ||
				input.logTimestamp !== undefined ||
				input.resolvedAt !== undefined,
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
		resolvedAt,
		...changes
	}) => {
		const fields = {
			...changes,
			...(resolvedAt === undefined
				? {}
				: { resolvedAt: resolvedAt ?? undefined })
		};
		let operation = db.entities.issue
			.patch({ appName, stageName, fingerprint })
			.set(fields);
		if (countDelta !== undefined)
			operation = operation.add({ count: countDelta });
		await operation.go({ response: "none" });
	}
);

/** Deletes one Issue by stage and fingerprint. */
export const remove = fn(IssueKeySchema, async input => {
	await db.entities.issue.delete(input).go({ response: "none" });
});

/** Deletes every persisted Issue without changing monitoring configuration. */
export async function purge() {
	const apps = await db.entities.app.query.byType({}).go({ pages: "all" });
	for (const app of apps.data) {
		const stages = await db.entities.stage.query
			.stage({ appName: app.appName })
			.go({ pages: "all" });
		for (const stage of stages.data) {
			const issues = await list({
				appName: stage.appName,
				stageName: stage.stageName
			});
			for (const issue of issues) await remove(issue);
		}
	}
}
