export type CognitoPasswordPolicy = {
	minimumLength: number;
	passwordHistorySize: number;
	requireLowercase: boolean;
	requireNumbers: boolean;
	requireSymbols: boolean;
	requireUppercase: boolean;
	temporaryPasswordValidityDays: number;
};

export type Route53Domain = {
	name: string;
	dns?: {
		provider: "route53";
		zoneId?: string;
	};
};

export type ExternalDnsDomain = {
	name: string;
	dns: {
		provider: "external";
		certificateArn: string;
	};
};

export type ConsoleConfig = {
	profile: string;
	region: string;
	domain?: Route53Domain | ExternalDnsDomain;
	auth: {
		passwordPolicy: CognitoPasswordPolicy;
	};
};
