export type CognitoPasswordPolicy = {
	minimumLength: number;
	passwordHistorySize: number;
	requireLowercase: boolean;
	requireNumbers: boolean;
	requireSymbols: boolean;
	requireUppercase: boolean;
	temporaryPasswordValidityDays: number;
};

export type ConsoleConfig = {
	profile: string;
	region: string;
	domain?: string;
	auth: {
		passwordPolicy: CognitoPasswordPolicy;
	};
};
