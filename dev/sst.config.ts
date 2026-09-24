/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
	app(input) {
		return {
			name: "sst-console",
			removal: input?.stage === "prod" ? "retain" : "remove",
			protect: ["prod"].includes(input?.stage),
			home: "aws",
			providers: {
				aws: {
					profile: "sandbox",
					region: "ap-southeast-2"
				}
			}
		};
	},
	async run() {
		const { Console } = await import("sst-console");
		const console = new Console("Console");

		return {
			connectionProbeFunctionName: console.connectionProbeFunctionName,
			connectionProbeRoleArn: console.connectionProbeRoleArn,
			externalId: console.externalId,
			connectorTemplateUrl: console.connectorTemplateUrl,
			connectorQuickCreateUrl: console.connectorQuickCreateUrl
		};
	}
});
