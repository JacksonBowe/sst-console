import { z } from "zod";

import { StageKeySchema } from "../app";
import { db } from "../db";
import { fn } from "../util/fn";
import { issueErrors } from "./errors";

const SubscriptionKeySchema = StageKeySchema.extend({
	region: z.string().min(1),
	logGroup: z.string().min(1)
});

export const SubscriptionSchema = SubscriptionKeySchema.extend({
	accountId: z.string().min(1),
	filterName: z.string().min(1),
	functionArn: z.string().min(1).optional(),
	status: z.enum(["pending", "attached", "failed", "removed"]),
	lastError: z.string().min(1).optional(),
	updatedAt: z.iso.datetime()
});

export type Subscription = z.infer<typeof SubscriptionSchema>;

const SubscriberSchema = z.object({
	accountId: z.string().min(1),
	region: z.string().min(1),
	stackName: z.string().min(1),
	status: z.enum(["pending", "ready", "failed"]),
	functionArn: z.string().min(1).optional(),
	lastError: z.string().min(1).optional(),
	updatedAt: z.iso.datetime()
});

const SourceSchema = z.object({
	accountId: z.string().min(1),
	region: z.string().min(1),
	logGroup: z.string().min(1)
});

/** Creates one Console-owned CloudWatch Logs subscription record. */
export const create = fn(SubscriptionSchema, async input => {
	await db.entities.issueSubscription.create(input).go({ response: "none" });
});

/** Gets one Console-owned CloudWatch Logs subscription record or throws when absent. */
export const get = fn(SubscriptionKeySchema, async input => {
	const result = await db.entities.issueSubscription
		.get(input)
		.go({ consistent: true });
	if (!result.data) throw issueErrors.subscriptionNotFound();
	return SubscriptionSchema.parse(result.data);
});

/** Lists Console-owned CloudWatch Logs subscriptions for one stage. */
export const list = fn(StageKeySchema, async input => {
	const result = await db.entities.issueSubscription.query
		.stage(input)
		.go({ pages: "all" });
	return result.data.map(subscription =>
		SubscriptionSchema.parse(subscription)
	);
});

/** Updates mutable fields for one CloudWatch Logs subscription record. */
export const update = fn(
	SubscriptionKeySchema.extend({
		accountId: z.string().min(1).optional(),
		filterName: z.string().min(1).optional(),
		functionArn: z.string().min(1).nullable().optional(),
		status: z.enum(["pending", "attached", "failed", "removed"]).optional(),
		lastError: z.string().min(1).nullable().optional(),
		updatedAt: z.iso.datetime().optional()
	}).refine(
		input =>
			input.accountId !== undefined ||
			input.filterName !== undefined ||
			input.functionArn !== undefined ||
			input.status !== undefined ||
			input.lastError !== undefined ||
			input.updatedAt !== undefined,
		"At least one subscription field must be updated"
	),
	async ({
		appName,
		stageName,
		region,
		logGroup,
		functionArn,
		lastError,
		...changes
	}) => {
		await db.entities.issueSubscription
			.patch({ appName, stageName, region, logGroup })
			.set({
				...changes,
				...(functionArn === undefined
					? {}
					: { functionArn: functionArn ?? undefined }),
				...(lastError === undefined
					? {}
					: { lastError: lastError ?? undefined })
			})
			.go({ response: "none" });
	}
);

/** Deletes one Console-owned CloudWatch Logs subscription record. */
export const remove = fn(SubscriptionKeySchema, async input => {
	await db.entities.issueSubscription.delete(input).go({ response: "none" });
});

/** Creates or updates a subscription during idempotent monitoring reconciliation. */
export const upsert = fn(SubscriptionSchema, async input => {
	await db.entities.issueSubscription.upsert(input).go({ response: "none" });
});

/** Lists subscriptions associated with one received CloudWatch Logs source. */
export const listBySource = fn(SourceSchema, async input => {
	const result = await db.entities.issueSubscription.query
		.bySource(input)
		.go({ pages: "all" });
	return result.data.map(subscription =>
		SubscriptionSchema.parse(subscription)
	);
});

/** Persists current regional subscriber-stack state. */
export const upsertSubscriber = fn(SubscriberSchema, async input => {
	await db.entities.issueSubscriber.upsert(input).go({ response: "none" });
});
