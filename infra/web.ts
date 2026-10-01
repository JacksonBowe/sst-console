import config from "../console.config";
import type { ConsoleConfig } from "../console.config.types";
import { api } from "./api";
import { passwordPolicy } from "./auth";
import { outputs as connector } from "./connector";

const domainConfig: ConsoleConfig = config;
const domain =
	domainConfig.domain?.dns?.provider === "external"
		? {
				name: domainConfig.domain.name,
				dns: false as const,
				cert: domainConfig.domain.dns.certificateArn
			}
		: domainConfig.domain?.dns?.zoneId
			? {
					name: domainConfig.domain.name,
					dns: sst.aws.dns({
						zone: domainConfig.domain.dns.zoneId
					})
				}
			: domainConfig.domain
				? { name: domainConfig.domain.name }
				: undefined;

export const site = new sst.aws.StaticSite("Site", {
	path: "packages/web",
	build: {
		command: "bun i && bun run build",
		output: "dist/spa"
	},
	environment: {
		VITE_API_ENDPOINT: api.url,
		VITE_AUTH_PASSWORD_POLICY: JSON.stringify(passwordPolicy),
		VITE_CONNECTOR_QUICK_CREATE_URL: connector.connectorQuickCreateUrl
	},
	domain
});
