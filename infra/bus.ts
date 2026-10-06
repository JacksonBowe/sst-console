import { assumeAccountRolePermission, externalId } from "./console";
import { consoleConnections, consoleData } from "./storage";
import { issueEnvironment, issueReconcileQueue } from "./issue";

export const bus = new sst.aws.Bus("Bus");

bus.subscribe(
	"AccountEvents",
	{
		handler: "packages/functions/src/events/account.handler",
		link: [consoleConnections, consoleData, issueReconcileQueue],
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
		link: [consoleConnections, consoleData, issueReconcileQueue],
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
