import { cognitoUserPool, cognitoUserPoolClient, passwordPolicy } from "./auth";
import { assumeAccountRolePermission, externalId } from "./console";
import { consoleConnections, consoleData } from "./storage";

export const api = new sst.aws.Function("Api", {
	url: true,
	handler: "packages/functions/src/api/index.handler",
	link: [
		consoleData,
		consoleConnections,
		cognitoUserPool,
		cognitoUserPoolClient
	],
	environment: {
		SST_CONSOLE_EXTERNAL_ID: externalId,
		SST_CONSOLE_PASSWORD_POLICY: JSON.stringify(passwordPolicy)
	},
	permissions: [assumeAccountRolePermission]
});

// export const testFunction = new sst.aws.Function("TestFunction", {
// 	handler: "packages/functions/src/api/index.handler",
// 	link: [consoleData, consoleConnections],
// 	environment: {
// 		SST_CONSOLE_EXTERNAL_ID: externalId
// 	},
// 	permissions: [assumeAccountRolePermission]
// });
