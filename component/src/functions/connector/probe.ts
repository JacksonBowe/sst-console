import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import {
	AssumeRoleCommand,
	GetCallerIdentityCommand,
	STSClient
} from "@aws-sdk/client-sts";

type ProbeEvent = {
	roleArn?: string;
	region?: string;
};

type Bootstrap = {
	state?: unknown;
};

export async function handler(event: ProbeEvent) {
	if (!event.roleArn) {
		throw new Error("roleArn is required");
	}
	const region = event.region ?? process.env.AWS_REGION;
	if (!region) {
		throw new Error("AWS_REGION is not configured");
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

	const credentials = {
		accessKeyId: assumed.Credentials.AccessKeyId!,
		secretAccessKey: assumed.Credentials.SecretAccessKey!,
		sessionToken: assumed.Credentials.SessionToken
	};
	const target = new STSClient({ credentials, region });
	const identity = await target.send(new GetCallerIdentityCommand({}));
	const ssm = new SSMClient({ credentials, region });
	const bootstrapParameter = await ssm.send(
		new GetParameterCommand({ Name: "/sst/bootstrap" })
	);
	if (!bootstrapParameter.Parameter?.Value) {
		throw new Error("SST bootstrap metadata is empty");
	}

	const bootstrap = JSON.parse(
		bootstrapParameter.Parameter.Value
	) as Bootstrap;
	if (typeof bootstrap.state !== "string" || !bootstrap.state) {
		throw new Error(
			"SST bootstrap metadata does not contain a state bucket"
		);
	}

	const stateBucket = bootstrap.state;
	const s3 = new S3Client({ credentials, region });
	const stateObjects = await s3.send(
		new ListObjectsV2Command({
			Bucket: stateBucket,
			Prefix: "app/"
		})
	);
	const states = (stateObjects.Contents ?? []).flatMap(object => {
		if (!object.Key) return [];
		const match = /^app\/([^/]+)\/(.+)\.json$/.exec(object.Key);
		if (!match) return [];

		return [
			{
				app: match[1],
				stage: match[2],
				key: object.Key,
				lastModified: object.LastModified?.toISOString(),
				size: object.Size
			}
		];
	});

	return {
		accountId: identity.Account,
		arn: identity.Arn,
		roleArn: event.roleArn,
		region,
		stateBucket,
		states,
		statesTruncated: stateObjects.IsTruncated ?? false
	};
}
