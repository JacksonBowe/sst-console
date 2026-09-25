// import { cert, domain } from "./dns"

import { api } from "./api";

export const site = new sst.aws.StaticSite("Site", {
	path: "packages/web",
	build: {
		command: "bun i && bun run build",
		output: "dist/spa"
	},
	environment: {
		VITE_API_ENDPOINT: api.url
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
