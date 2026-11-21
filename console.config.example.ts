import type { ConsoleConfig } from "./console.config.types";

export default {
	profile: "sandbox",
	region: "ap-southeast-2",
	domain: undefined,
	auth: {
		// Optional invitation override. Include your Console URL and both placeholders:
		// adminCreateUserConfig: {
		// 	inviteMessageTemplate: {
		// 		emailSubject: "Your SST Console invitation",
		// 		emailMessage: "Sign in at https://console.example.com with username {username} and temporary password {####}."
		// 	}
		// },
		passwordPolicy: {
			minimumLength: 8,
			passwordHistorySize: 0,
			requireLowercase: true,
			requireNumbers: true,
			requireSymbols: true,
			requireUppercase: true,
			temporaryPasswordValidityDays: 7
		}
	},
	issue: {
		queueDrainSchedule: "rate(5 minutes)"
	}
} satisfies ConsoleConfig;
