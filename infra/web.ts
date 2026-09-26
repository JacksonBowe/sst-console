// import { cert, domain } from "./dns"

import { api } from "./api";
import { passwordPolicy } from "./auth";

export const site = new sst.aws.StaticSite("Site", {
	path: "packages/web",
	build: {
		command: "bun i && bun run build",
		output: "dist/spa"
	},
	environment: {
		VITE_API_ENDPOINT: api.url,
		VITE_AUTH_PASSWORD_POLICY: JSON.stringify(passwordPolicy)
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
