import { cognitoUserPool, cognitoUserPoolClient } from "./auth";
import { externalId } from "./console";
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
		SST_CONSOLE_EXTERNAL_ID: externalId
	},
	permissions: [
		{
			actions: ["sts:AssumeRole"],
			resources: ["arn:aws:iam::*:role/SSTConsoleRole"]
		}
	]
});
