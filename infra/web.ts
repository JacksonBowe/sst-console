// import { cert, domain } from "./dns"

import { api } from "./api";
import { passwordPolicy } from "./auth";
import { outputs as connector } from "./connector";

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
	}
	// ...(domain
	// 	? {
	// 		domain: {
	// 			name: domain,
	// 			dns: false,
	// 			cert: cert
	// 		}
	// 	}
	// 	: {}
	// ),
});
