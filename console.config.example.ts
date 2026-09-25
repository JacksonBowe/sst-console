import type { ConsoleConfig } from "./console.config.types";

export default {
	profile: "sandbox",
	region: "ap-southeast-2",
	domain: undefined,
	debug: {
		username: "debug",
		password: "replace-before-deploy"
	},
	auth: {
		passwordPolicy: {
			minimumLength: 8,
			passwordHistorySize: 0,
			requireLowercase: true,
			requireNumbers: true,
			requireSymbols: true,
			requireUppercase: true,
			temporaryPasswordValidityDays: 7
		}
	}
} satisfies ConsoleConfig;
