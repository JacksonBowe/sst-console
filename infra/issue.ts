import config from "../console.config";
import { assumeAccountRolePermission, externalId } from "./console";
import { consoleConnections, consoleData } from "./storage";
import { bus } from "./event-bus";

export const issueReconcileQueue = new sst.aws.Queue("IssueReconcileQueue");
export const issueIngressQueue = new sst.aws.Queue("IssueIngressQueue");

new sst.aws.CronV2("IssueQueueDrain", {
	schedule: config.issue.queueDrainSchedule,
	retries: 0,
	function: {
		handler: "packages/functions/src/events/issue-queue-drain.handler",
		timeout: "55 seconds",
		retries: 0,
		link: [
			bus,
			consoleData,
			consoleConnections,
			issueIngressQueue,
			issueReconcileQueue
		],
		environment: {
			SST_CONSOLE_EXTERNAL_ID: externalId,
			SST_CONSOLE_ISSUE_STAGE: $app.stage
		},
		permissions: [
			assumeAccountRolePermission,
			{
				actions: ["sqs:ReceiveMessage", "sqs:DeleteMessage"],
				resources: [issueIngressQueue.arn, issueReconcileQueue.arn]
			},
			{
				actions: ["sqs:GetQueueAttributes", "sqs:SetQueueAttributes"],
				resources: [issueIngressQueue.arn]
			}
		]
	}
});

export const issueEnvironment = {
	SST_CONSOLE_ISSUE_STAGE: $app.stage
};
