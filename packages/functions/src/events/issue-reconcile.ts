import * as Issue from "@console/core/issue";
import type { SQSHandler } from "aws-lambda";
import { z } from "zod";

const schema = z.object({
	appName: z.string().min(1),
	stageName: z.string().min(1),
	action: z.enum(["reconcile", "disconnect"]),
	attempt: z.number().int().nonnegative()
});

/** Reconciles queued regional subscriber and log-filter changes for one stage. */
export const handler: SQSHandler = async event => {
	for (const record of event.Records) {
		const input = schema.parse(JSON.parse(record.body));
		console.log("Issue reconciliation started", input);
		await Issue.Monitoring.reconcileStage(input);
		console.log("Issue reconciliation complete", input);
	}
};
