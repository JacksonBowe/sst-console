import {
	AssumeRoleCommand,
	GetCallerIdentityCommand,
	STSClient
} from "@aws-sdk/client-sts";
type ProbeEvent = {
	roleArn?: string;
};

export async function handler(event: ProbeEvent) {
	if (!event.roleArn) {
		throw new Error("roleArn is required");
	}

	const sts = new STSClient({});
	const externalId = process.env.SST_CONSOLE_EXTERNAL_ID;
	if (!externalId) {
		throw new Error("SST_CONSOLE_EXTERNAL_ID is not configured");
	}
	const assumed = await sts.send(
		new AssumeRoleCommand({
			RoleArn: event.roleArn,
			RoleSessionName: "sst-console-connection-probe",
			ExternalId: externalId
		})
	);

	if (!assumed.Credentials) {
		throw new Error(
			"AWS did not return credentials for the connected account"
		);
	}

	const target = new STSClient({
		credentials: {
			accessKeyId: assumed.Credentials.AccessKeyId!,
			secretAccessKey: assumed.Credentials.SecretAccessKey!,
			sessionToken: assumed.Credentials.SessionToken
		}
	});
	const identity = await target.send(new GetCallerIdentityCommand({}));

	return {
		accountId: identity.Account,
		arn: identity.Arn,
		roleArn: event.roleArn
	};
}
