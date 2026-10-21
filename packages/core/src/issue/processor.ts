import { createHash } from "node:crypto";
import { Resource } from "sst";
import { bus } from "sst/aws/bus";

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
	const sourceKey = createHash("sha256")
		.update(
			[
				input.source.accountId,
				input.source.region,
				input.source.logGroup
			].join("\n")
		)
		.digest("hex");
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
		const occurredAt = new Date(event.timestamp).toISOString();
		const occurrence = await Issue.recordOccurrence({
			issue: {
				...key,
				accountId: input.source.accountId,
				region: input.source.region,
				...(subscription.functionArn
					? {
							functionArn: subscription.functionArn,
							functionName: functionName(subscription.functionArn)
						}
					: {}),
				errorType: parsed.errorType,
				errorMessage: parsed.errorMessage,
				...(parsed.stack ? { stack: parsed.stack } : {}),
				status: "open",
				statusUpdatedAt: occurredAt,
				count: 1,
				firstSeenAt: occurredAt,
				lastSeenAt: occurredAt,
				logGroup: input.source.logGroup,
				logStream: input.source.logStream,
				logTimestamp: event.timestamp
			},
			sourceKey,
			eventId: event.id
		});
		if (occurrence.outcome === "duplicate") continue;
		await bus.publish(
			Resource.Bus,
			occurrence.outcome === "created"
				? Issue.Events.Created
				: Issue.Events.Updated,
			{ issue: occurrence.issue }
		);
	}
}

function functionName(functionArn: string | undefined) {
	return functionArn?.split(":function:")[1];
}
