import { externalId } from "./console";
import { consoleData } from "./storage";

const { default: config } = (await import("../console.config")) as {
	default: {
		debug?: { username: string; password: string };
	};
};

export const api = new sst.aws.Function("Api", {
	url: true,
	handler: "packages/functions/src/api/index.handler",
	link: [consoleData],
	environment: {
		SST_CONSOLE_EXTERNAL_ID: externalId,
		...(config.debug
			? {
					SST_CONSOLE_DEBUG_USERNAME: config.debug.username,
					SST_CONSOLE_DEBUG_PASSWORD: config.debug.password
				}
			: {})
	},
	permissions: [
		{
			actions: ["sts:AssumeRole"],
			resources: ["arn:aws:iam::*:role/SSTConsoleRole"]
		}
	]
});
