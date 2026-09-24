/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
	async app(input) {
		const { default: config } = await import("./console.config");

		return {
			name: "sst-console",
			removal: input?.stage === "prod" ? "retain" : "remove",
			protect: ["prod"].includes(input?.stage),
			home: "aws",
			providers: {
				aws: {
					profile: config.profile,
					region: config.region
				}
			}
		};
	},
	async run() {
		const { readdirSync } = await import("node:fs");
		const outputs = {};

		for (const file of readdirSync("./infra")) {
			const module = await import(`./infra/${file}`);
			if (module.outputs) Object.assign(outputs, module.outputs);
		}

		return outputs;
	}
});
