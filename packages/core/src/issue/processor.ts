import { createHash } from "node:crypto";

import { isIssueWorkerFunction } from "./monitoring-utils";
import * as Issue from "./issue";
import * as Subscription from "./issue.subscription";
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
	const subscriptions = await Subscription.listBySource(input.source);
	const subscription = subscriptions.find(item => item.status === "attached");
	if (!subscription) {
		if (
			subscriptions.length === 0 ||
			subscriptions.some(item => item.status === "pending")
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
		const key = {
			appName: subscription.appName,
			stageName: subscription.stageName,
			fingerprint
		};
		const existing = await Issue.get(key);
		const now = new Date().toISOString();
		if (!existing) {
			await Issue.create({
				...key,
				error: parsed.error,
				message: parsed.message,
				count: 1,
				firstSeenAt: now,
				lastSeenAt: now,
				logGroup: input.source.logGroup,
				logStream: input.source.logStream,
				logTimestamp: event.timestamp
			}).catch(async error => {
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
	await Issue.update({
		appName: subscription.appName,
		stageName: subscription.stageName,
		fingerprint,
		error: parsed.error,
		message: parsed.message,
		countDelta: 1,
		lastSeenAt: now,
		logGroup: source.logGroup,
		logStream: source.logStream,
		logTimestamp: timestamp,
		resolvedAt: null
	});
}
