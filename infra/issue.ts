import {
	assumeAccountRolePermission,
	controlAccountId,
	externalId
} from "./console";
import { consoleConnections, consoleData } from "./storage";
import { bus } from "./event-bus";

const region = aws.getRegionOutput().region;

export const issueReconcileQueue = new sst.aws.Queue("IssueReconcileQueue");
export const issueIngressQueue = new sst.aws.Queue("IssueIngressQueue");

issueReconcileQueue.subscribe({
	handler: "packages/functions/src/events/issue-reconcile.handler",
	link: [
		consoleData,
		consoleConnections,
		issueReconcileQueue,
		issueIngressQueue
	],
	environment: {
		SST_CONSOLE_EXTERNAL_ID: externalId,
		SST_CONSOLE_ISSUE_CONTROL_ACCOUNT_ID: controlAccountId,
		SST_CONSOLE_ISSUE_STAGE: $app.stage,
		SST_CONSOLE_ISSUE_QUEUE_ARN: issueIngressQueue.arn,
		SST_CONSOLE_ISSUE_QUEUE_REGION: region,
		SST_CONSOLE_ISSUE_QUEUE_URL: issueIngressQueue.url,
		SST_CONSOLE_ISSUE_RECONCILE_QUEUE_URL: issueReconcileQueue.url
	},
	permissions: [
		assumeAccountRolePermission,
		{
			actions: ["sqs:SetQueueAttributes"],
			resources: [issueIngressQueue.arn]
		}
	]
});

issueIngressQueue.subscribe({
	handler: "packages/functions/src/events/issue-ingress.handler",
	link: [bus, consoleData, issueIngressQueue]
});

export const issueEnvironment = {
	SST_CONSOLE_ISSUE_CONTROL_ACCOUNT_ID: controlAccountId,
	SST_CONSOLE_ISSUE_STAGE: $app.stage,
	SST_CONSOLE_ISSUE_QUEUE_ARN: issueIngressQueue.arn,
	SST_CONSOLE_ISSUE_QUEUE_REGION: region,
	SST_CONSOLE_ISSUE_QUEUE_URL: issueIngressQueue.url,
	SST_CONSOLE_ISSUE_RECONCILE_QUEUE_URL: issueReconcileQueue.url
};
