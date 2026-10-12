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
					input.source.accountId,
					input.source.region,
					subscription.functionArn ?? input.source.logGroup,
					parsed.errorType,
					parsed.errorMessage,
					parsed.stack ?? ""
				].join("\n")
			)
			.digest("hex");
		const key = {
			appName: subscription.appName,
			stageName: subscription.stageName,
			fingerprint
		};
		const existing = await Issue.find(key);
		const occurredAt = new Date(event.timestamp).toISOString();
		if (!existing) {
			await Issue.create({
				...key,
				accountId: input.source.accountId,
				region: input.source.region,
				functionArn: subscription.functionArn,
				functionName: functionName(subscription.functionArn),
				errorType: parsed.errorType,
				errorMessage: parsed.errorMessage,
				stack: parsed.stack,
				status: "open",
				statusUpdatedAt: occurredAt,
				count: 1,
				firstSeenAt: occurredAt,
				lastSeenAt: occurredAt,
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
					occurredAt,
					existing
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
			occurredAt,
			existing
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
	occurredAt: string,
	existing: Issue.Issue | null
) {
	const latest = !existing || occurredAt >= existing.lastSeenAt;
	const reopen = existing?.status === "resolved";
	await Issue.update({
		appName: subscription.appName,
		stageName: subscription.stageName,
		fingerprint,
		errorType: parsed.errorType,
		errorMessage: parsed.errorMessage,
		stack: parsed.stack,
		countDelta: 1,
		...(latest
			? {
					lastSeenAt: occurredAt,
					logGroup: source.logGroup,
					logStream: source.logStream,
					logTimestamp: timestamp
				}
			: {}),
		...(reopen
			? { status: "open" as const, statusUpdatedAt: occurredAt }
			: {})
	});
}

function functionName(functionArn: string | undefined) {
	return functionArn?.split(":function:")[1];
}
