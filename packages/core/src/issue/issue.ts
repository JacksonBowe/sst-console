import { z } from "zod";
import { defineEvent } from "../event";

import { StageKeySchema } from "../app";
import { db } from "../db";
import { fn } from "../util/fn";
import { issueErrors } from "./errors";

const IssueKeySchema = StageKeySchema.extend({
	fingerprint: z.string().min(1)
});

const IngressEventKeySchema = StageKeySchema.extend({
	sourceKey: z.string().length(64),
	eventId: z.string().min(1).max(512)
});

const ingressEventRetentionSeconds = 7 * 24 * 60 * 60;
const recurrenceQuietPeriodMs = 15 * 60 * 1000;

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

const IngressEventSchema = IngressEventKeySchema.extend({
	ttl: z.number().int().positive()
});

export const Events = {
	Created: defineEvent("issue.created", z.object({ issue: IssueSchema })),
	Recurred: defineEvent("issue.recurred", z.object({ issue: IssueSchema }))
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

async function findIngressEvent(input: z.infer<typeof IngressEventKeySchema>) {
	const result = await db.entities.issueIngressEvent
		.get(input)
		.go({ consistent: true });
	return result.data ? IngressEventSchema.parse(result.data) : null;
}

/** Gets one Issue by stage and fingerprint or throws when it does not exist. */
export const get = fn(IssueKeySchema, async input => {
	const issue = await getRecord(input);
	if (!issue) throw issueErrors.notFound();
	return issue;
});

const RecordOccurrenceSchema = z.object({
	issue: IssueSchema,
	sourceKey: z.string().length(64),
	eventId: z.string().min(1).max(512)
});

export type RecordOccurrenceResult =
	| { outcome: "created"; issue: Issue }
	| { outcome: "recurred"; issue: Issue }
	| { outcome: "updated"; issue: Issue }
	| { outcome: "duplicate" };

/** Records one CloudWatch log event and its Issue mutation in one transaction. */
export const recordOccurrence = fn(
	RecordOccurrenceSchema,
	async (input): Promise<RecordOccurrenceResult> => {
		const eventKey = {
			appName: input.issue.appName,
			stageName: input.issue.stageName,
			sourceKey: input.sourceKey,
			eventId: input.eventId
		};
		if (await findIngressEvent(eventKey)) return { outcome: "duplicate" };

		for (let attempt = 0; attempt < 5; attempt++) {
			const existing = await find({
				appName: input.issue.appName,
				stageName: input.issue.stageName,
				fingerprint: input.issue.fingerprint
			});
			const latest =
				!existing || input.issue.lastSeenAt >= existing.lastSeenAt;
			const reopen = existing?.status === "resolved";
			const recurred = existing
				? isRecurrence(existing, input.issue)
				: false;
			const transaction = await db.transaction
				.write(({ issue, issueIngressEvent }) => [
					issueIngressEvent
						.create({
							...eventKey,
							ttl:
								Math.floor(Date.now() / 1000) +
								ingressEventRetentionSeconds
						})
						.commit(),
					existing
						? issue
								.patch({
									appName: input.issue.appName,
									stageName: input.issue.stageName,
									fingerprint: input.issue.fingerprint
								})
								.set({
									errorType: input.issue.errorType,
									errorMessage: input.issue.errorMessage,
									stack: input.issue.stack,
									...(latest
										? {
												lastSeenAt:
													input.issue.lastSeenAt,
												logGroup: input.issue.logGroup,
												logStream:
													input.issue.logStream,
												logTimestamp:
													input.issue.logTimestamp
											}
										: {}),
									...(reopen
										? {
												status: "open" as const,
												statusUpdatedAt:
													input.issue.statusUpdatedAt
											}
										: {})
								})
								.add({ count: 1 })
								.commit()
						: issue.create(input.issue).commit()
				])
				.go();
			if (!transaction.canceled) {
				const issue = await get({
					appName: input.issue.appName,
					stageName: input.issue.stageName,
					fingerprint: input.issue.fingerprint
				});
				return {
					outcome: existing
						? recurred
							? "recurred"
							: "updated"
						: "created",
					issue
				};
			}
			if (await findIngressEvent(eventKey))
				return { outcome: "duplicate" };
		}

		throw new Error("Issue occurrence transaction did not commit");
	}
);

function isRecurrence(existing: Issue, incoming: Issue) {
	// TODO: Make recurrence classification transactional. Delayed or concurrent
	// log events can reopen a resolved Issue or produce duplicate recurrences.
	if (existing.status === "suppressed") return false;
	if (existing.status === "resolved") return true;
	if (existing.statusUpdatedAt > existing.lastSeenAt) return true;
	return (
		Date.parse(incoming.lastSeenAt) - Date.parse(existing.lastSeenAt) >=
		recurrenceQuietPeriodMs
	);
}

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

const ListIngressEventsSchema = z
	.object({
		appName: z.string().min(1).optional(),
		stageName: z.string().min(1).optional()
	})
	.refine(
		input =>
			(input.appName === undefined && input.stageName === undefined) ||
			(input.appName !== undefined && input.stageName !== undefined),
		"appName and stageName must be provided together"
	);

/** Lists retained ingress-event markers globally or for one Stage. */
export const listIngressEvents = fn(ListIngressEventsSchema, async input => {
	const result = input.appName
		? await db.entities.issueIngressEvent.query
				.stage({ appName: input.appName, stageName: input.stageName! })
				.go({ pages: "all" })
		: await db.entities.issueIngressEvent.query
				.byType({})
				.go({ pages: "all" });
	return result.data.map(event => IngressEventSchema.parse(event));
});

/** Deletes one retained ingress-event marker. */
export const removeIngressEvent = fn(IngressEventKeySchema, async input => {
	await db.entities.issueIngressEvent.delete(input).go({ response: "none" });
});

/** Deletes every persisted Issue without changing monitoring configuration. */
export async function purge() {
	const [issues, ingressEvents] = await Promise.all([
		list({}),
		listIngressEvents({})
	]);
	for (const issue of issues) await remove(issue);
	for (const event of ingressEvents) await removeIngressEvent(event);
}
