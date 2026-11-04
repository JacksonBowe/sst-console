import {
	CloudFormationClient,
	DescribeStackResourceCommand
} from "@aws-sdk/client-cloudformation";
import {
	EventBridgeClient,
	PutRuleCommand,
	PutTargetsCommand
} from "@aws-sdk/client-eventbridge";
import {
	GetBucketNotificationConfigurationCommand,
	PutBucketNotificationConfigurationCommand,
	S3Client
} from "@aws-sdk/client-s3";
import type { assume } from "./connector";
import { accountErrors } from "./errors";

/** Enables bucket events and routes them from the Workload Account to the Console bus. */
export async function configureForwarding(input: {
	accountId: string;
	roleArn: string;
	region: string;
	credentials: Awaited<ReturnType<typeof assume>>["credentials"];
	bucket: string;
	busArn: string | undefined;
}): Promise<void> {
	// Preserve notifications configured by other consumers while enabling EventBridge.
	const s3 = new S3Client({
		credentials: input.credentials,
		region: input.region
	});
	const existing = await s3.send(
		new GetBucketNotificationConfigurationCommand({ Bucket: input.bucket })
	);
	await s3.send(
		new PutBucketNotificationConfigurationCommand({
			Bucket: input.bucket,
			NotificationConfiguration: {
				EventBridgeConfiguration: {},
				LambdaFunctionConfigurations:
					existing.LambdaFunctionConfigurations,
				QueueConfigurations: existing.QueueConfigurations,
				TopicConfigurations: existing.TopicConfigurations
			}
		})
	);
	if (!input.busArn) throw accountErrors.missingBusArn();
	// The connector role and stack share the installation-specific suffix.
	const match =
		/^arn:([^:]+):iam::\d{12}:role\/SSTConsoleRole-(\d{12}-[a-f0-9]{16})$/.exec(
			input.roleArn
		);
	if (!match) throw accountErrors.invalidForwardingRoleArn();
	const [, partition, suffix] = match;
	const cloudformation = new CloudFormationClient({
		credentials: input.credentials,
		region: input.region
	});
	const resource = await cloudformation.send(
		new DescribeStackResourceCommand({
			StackName: `SSTConsoleConnection-${suffix}`,
			LogicalResourceId: "SSTConsoleEventPublisherRole"
		})
	);
	const roleName = resource.StackResourceDetail?.PhysicalResourceId;
	if (!roleName) throw accountErrors.missingPublisherRole();

	const events = new EventBridgeClient({
		credentials: input.credentials,
		region: input.region
	});
	// Match this bucket only; consumers filter supported artifact keys and event types.
	const rule = `SSTConsoleStateEvents-${suffix}`;
	await events.send(
		new PutRuleCommand({
			Name: rule,
			State: "ENABLED",
			EventPattern: JSON.stringify({
				source: ["aws.s3"],
				detail: { bucket: { name: [input.bucket] } }
			})
		})
	);
	// The Connection stack publisher role grants this target permission on the Console bus.
	const result = await events.send(
		new PutTargetsCommand({
			Rule: rule,
			Targets: [
				{
					Id: "SSTConsoleStateEvents",
					Arn: input.busArn,
					RoleArn: `arn:${partition}:iam::${input.accountId}:role/${roleName}`
				}
			]
		})
	);
	if (result.FailedEntryCount || result.FailedEntries?.length)
		throw accountErrors.forwardingTargetFailed();
}
