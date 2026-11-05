import { assumeAccountRolePermission, externalId } from "./console";
import { bus } from "./event-bus";
import {
	issueEnvironment,
	issueIngressQueue,
	issueReconcileQueue
} from "./issue";
import { consoleConnections, consoleData } from "./storage";

export { bus } from "./event-bus";

// TODO: Investigate restricting internal event subscribers to the Console
// account and narrowing Workload Account bus permissions to prevent spoofed
// internal events. Include future internal subscribers in this review.
bus.subscribe(
	"AlertEvents",
	{
		handler: "packages/functions/src/events/alert-rule.handler",
		link: [consoleData, consoleConnections]
	},
	{
		pattern: { detailType: [{ prefix: "issue." }] }
	}
);

bus.subscribe(
	"AccountEvents",
	{
		handler: "packages/functions/src/events/account.handler",
		link: [
			bus,
			consoleConnections,
			consoleData,
			issueIngressQueue,
			issueReconcileQueue
		],
		environment: {
			SST_CONSOLE_EXTERNAL_ID: externalId,
			SST_CONSOLE_BUS_ARN: bus.arn,
			...issueEnvironment
		},
		permissions: [assumeAccountRolePermission]
	},
	{
		pattern: {
			detailType: [{ prefix: "account." }]
		}
	}
);

bus.subscribe(
	"StateExternalEvents",
	{
		handler: "packages/functions/src/events/state-external.handler",
		link: [
			bus,
			consoleConnections,
			consoleData,
			issueIngressQueue,
			issueReconcileQueue
		],
		environment: {
			SST_CONSOLE_EXTERNAL_ID: externalId,
			...issueEnvironment
		},
		permissions: [assumeAccountRolePermission]
	},
	{
		pattern: { source: ["aws.s3"] }
	}
);

bus.subscribe(
	"StateEvents",
	{
		handler: "packages/functions/src/events/state.handler",
		link: [
			bus,
			consoleConnections,
			consoleData,
			issueIngressQueue,
			issueReconcileQueue
		],
		environment: {
			SST_CONSOLE_EXTERNAL_ID: externalId,
			...issueEnvironment
		},
		permissions: [assumeAccountRolePermission]
	},
	{ pattern: { detailType: [{ prefix: "state." }] } }
);

bus.subscribe(
	"AppEvents",
	{
		handler: "packages/functions/src/events/app.handler",
		link: [
			bus,
			consoleConnections,
			consoleData,
			issueIngressQueue,
			issueReconcileQueue
		],
		environment: {
			SST_CONSOLE_EXTERNAL_ID: externalId,
			...issueEnvironment
		},
		permissions: [assumeAccountRolePermission]
	},
	{ pattern: { detailType: [{ prefix: "app." }] } }
);
