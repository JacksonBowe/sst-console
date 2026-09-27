import { assumeAccountRolePermission, externalId } from "./console";
import { consoleConnections, consoleData } from "./storage";

export const bus = new sst.aws.Bus("Bus");

bus.subscribe(
	"AccountEvents",
	{
		handler: "packages/functions/src/events/account.handler",
		link: [consoleConnections, consoleData],
		environment: {
			SST_CONSOLE_EXTERNAL_ID: externalId
		},
		permissions: [assumeAccountRolePermission]
	},
	{
		pattern: {
			detailType: [{ prefix: "account." }]
		}
	}
);
