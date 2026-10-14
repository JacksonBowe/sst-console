import { processCandidate } from "@console/core/issue/processor";
import { withActor } from "@console/core/actor";
import type { SQSHandler } from "aws-lambda";
import { z } from "zod";

const schema = z.object({
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

/** Validates queued subscriber records and persists their Issue occurrences. */
export const handler: SQSHandler = async event => {
	await withActor({ type: "system", properties: {} }, async () => {
		for (const record of event.Records) {
			const input = schema.parse(JSON.parse(record.body));
			console.log("Processing Issue ingress candidate", {
				source: input.source,
				eventCount: input.events.length
			});
			await processCandidate(input);
		}
	});
};
