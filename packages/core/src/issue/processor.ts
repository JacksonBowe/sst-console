import { createHash } from "node:crypto";

import { db } from "../db";
import { isIssueWorkerFunction } from "./ingress-utils";
import { parseError } from "./parser";

export type IssueCandidate = {
	source: {
		accountId: string;
		region: string;
		logGroup: string;
		logStream: string;
	};
	events: Array<{ id: string; timestamp: number; message: string }>;
};

/** Validates an owned log source and records each detected error occurrence. */
export async function processCandidate(input: IssueCandidate) {
	if (isIssueWorkerFunction(input.source.logGroup)) return;
	const subscriptions = await db.entities.issueSubscription.query
		.bySource(input.source)
		.go({ pages: "all" });
	const subscription = subscriptions.data.find(
		item => item.status === "attached"
	);
	if (!subscription) {
		if (
			subscriptions.data.length === 0 ||
			subscriptions.data.some(item => item.status === "pending")
		)
			throw new Error("Issue subscription is not ready");
		return;
	}
	for (const event of input.events) {
		const parsed = parseError(event.message);
		if (!parsed) continue;
		const fingerprint = createHash("sha256")
			.update(
				[
					subscription.functionArn ?? input.source.logGroup,
					parsed.error,
					parsed.message
				].join("\n")
			)
			.digest("hex");
		const existing = await db.entities.issue
			.get({
				appName: subscription.appName,
				stageName: subscription.stageName,
				fingerprint
			})
			.go({ consistent: true });
		const now = new Date().toISOString();
		if (!existing.data) {
			await db.entities.issue
				.create({
					appName: subscription.appName,
					stageName: subscription.stageName,
					fingerprint,
					error: parsed.error,
					message: parsed.message,
					count: 1,
					firstSeenAt: now,
					lastSeenAt: now,
					logGroup: input.source.logGroup,
					logStream: input.source.logStream,
					logTimestamp: event.timestamp
				})
				.go({ response: "none" })
				.catch(async error => {
					if (error.name !== "ConditionalCheckFailedException")
						throw error;
					await incrementIssue(
						subscription,
						fingerprint,
						input.source,
						event.timestamp,
						parsed,
						now
					);
				});
			continue;
		}
		await incrementIssue(
			subscription,
			fingerprint,
			input.source,
			event.timestamp,
			parsed,
			now
		);
	}
}

/** Increments a grouped Issue after a concurrent or existing occurrence. */
async function incrementIssue(
	subscription: { appName: string; stageName: string },
	fingerprint: string,
	source: IssueCandidate["source"],
	timestamp: number,
	parsed: ReturnType<typeof parseError> & {},
	now: string
) {
	await db.entities.issue
		.patch({
			appName: subscription.appName,
			stageName: subscription.stageName,
			fingerprint
		})
		.set({
			error: parsed.error,
			message: parsed.message,
			lastSeenAt: now,
			logGroup: source.logGroup,
			logStream: source.logStream,
			logTimestamp: timestamp,
			resolvedAt: undefined
		})
		.add({ count: 1 })
		.go({ response: "none" });
}
