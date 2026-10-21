import {
	DeleteMessageBatchCommand,
	ReceiveMessageCommand,
	SQSClient
} from "@aws-sdk/client-sqs";
import { withActor } from "@console/core/actor";
import * as Issue from "@console/core/issue";
import { processCandidate } from "@console/core/issue/processor";
import { Resource } from "sst";
import { z } from "zod";

// Bound each scheduled run so the next minute's invocation can make progress.
const maxBatches = 10;
const drainDuration = 45_000;

// Lambda supplies credentials and region for both linked queues.
const sqs = new SQSClient({});

// Body sent by regional CloudWatch Logs subscriber Lambdas.
const ingressSchema = z.object({
	source: z.object({
		accountId: z.string().regex(/^\d{12}$/),
		region: z.string().min(1).max(64),
		logGroup: z.string().startsWith("/aws/lambda/").max(512),
		logStream: z.string().max(512)
	}),
	events: z
		.array(
			z.object({
				id: z.string().min(1).max(512),
				timestamp: z.number().int().nonnegative(),
				message: z.string().max(16_384)
			})
		)
		.min(1)
		.max(10)
});

// Body queued by Issue monitoring lifecycle operations.
const reconcileSchema = z.object({
	appName: z.string().min(1),
	stageName: z.string().min(1),
	action: z.enum(["reconcile", "disconnect"]),
	attempt: z.number().int().nonnegative()
});

/** Drains both Issue queues on the EventBridge Scheduler cadence. */
export async function handler(): Promise<void> {
	const results = await Promise.allSettled([
		drainQueue(Resource.IssueIngressQueue.url, processIngressMessage),
		drainQueue(Resource.IssueReconcileQueue.url, processReconcileMessage)
	]);

	for (const result of results)
		if (result.status === "rejected")
			console.error("Issue queue drain failed", result.reason);
}

async function drainQueue(
	queueUrl: string,
	process: (body: string) => Promise<void>
): Promise<void> {
	// Leave time for Lambda shutdown before its 55-second timeout.
	const deadline = Date.now() + drainDuration;

	for (let batch = 0; batch < maxBatches; batch++) {
		if (Date.now() >= deadline) {
			console.warn("Issue queue drain stopped before queue was empty", {
				queueUrl,
				reason: "time_limit"
			});
			return;
		}

		const response = await sqs.send(
			new ReceiveMessageCommand({
				QueueUrl: queueUrl,
				MaxNumberOfMessages: 10,
				// Scheduler cadence supplies waiting; long polling only adds Lambda time.
				WaitTimeSeconds: 0,
				// Failed messages become eligible for the next scheduled run.
				VisibilityTimeout: 120
			})
		);
		const messages = response.Messages ?? [];
		if (messages.length === 0) return;

		// Delete only completed work so failed siblings return after visibility expires.
		const successful = [];
		for (const message of messages) {
			try {
				if (!message.Body || !message.ReceiptHandle)
					throw new Error(
						"SQS message is missing body or receipt handle"
					);
				await process(message.Body);
				successful.push(message);
			} catch (error) {
				console.error("Issue queue message failed; leaving for retry", {
					queueUrl,
					messageId: message.MessageId,
					error
				});
			}
		}

		if (successful.length > 0) {
			const deleted = await sqs.send(
				new DeleteMessageBatchCommand({
					QueueUrl: queueUrl,
					Entries: successful.map((message, index) => ({
						Id: String(index),
						ReceiptHandle: message.ReceiptHandle!
					}))
				})
			);
			for (const failure of deleted.Failed ?? [])
				console.error("Issue queue message delete failed", {
					queueUrl,
					failure
				});
		}

		if (messages.length < 10) return;
	}

	console.warn("Issue queue drain reached batch limit", { queueUrl });
}

async function processIngressMessage(body: string): Promise<void> {
	// Invalid payloads throw and remain on SQS for retry.
	const input = ingressSchema.parse(JSON.parse(body));
	await withActor({ type: "system", properties: {} }, async () => {
		console.log("Processing Issue ingress candidate", {
			source: input.source,
			eventCount: input.events.length
		});
		await processCandidate(input);
	});
}

async function processReconcileMessage(body: string): Promise<void> {
	// Invalid payloads throw and remain on SQS for retry.
	const input = reconcileSchema.parse(JSON.parse(body));
	console.log("Issue reconciliation started", input);
	await Issue.Monitoring.reconcileStage(input);
	console.log("Issue reconciliation complete", input);
}
