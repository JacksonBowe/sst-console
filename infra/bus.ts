import { assumeAccountRolePermission, externalId } from "./console";
import { bus } from "./event-bus";
import {
	issueEnvironment,
	issueIngressQueue,
	issueReconcileQueue
} from "./issue";
import { consoleConnections, consoleData } from "./storage";

export { bus } from "./event-bus";

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
		pattern: {
			detailType: [{ prefix: "account." }]
		}
	}
);

bus.subscribe(
	"StateObjectEvents",
	{
		handler: "packages/functions/src/events/state.handler",
		link: [
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
		pattern: {
			source: ["aws.s3"],
			detailType: ["Object Created", "Object Deleted"],
			detail: { object: { key: [{ prefix: "app/" }] } }
		}
	}
);
