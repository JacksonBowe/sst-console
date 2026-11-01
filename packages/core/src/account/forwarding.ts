import {
	CloudFormationClient,
	DescribeStackResourceCommand
} from "@aws-sdk/client-cloudformation";
import {
	EventBridgeClient,
	PutRuleCommand,
	PutTargetsCommand
} from "@aws-sdk/client-eventbridge";
import { ServerError } from "../error";
import type { assume } from "./connector";

// The connector role and stack share the installation-specific suffix.
export async function configureForwarding(input: {
	accountId: string;
	roleArn: string;
	region: string;
	credentials: Awaited<ReturnType<typeof assume>>["credentials"];
	bucket: string;
	busArn: string;
}): Promise<void> {
	const match =
		/^arn:([^:]+):iam::\d{12}:role\/SSTConsoleRole-(\d{12}-[a-f0-9]{16})$/.exec(
			input.roleArn
		);
	if (!match)
		throw new ServerError("invalid_role_arn", "Invalid connector role ARN");
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
	if (!roleName)
		throw new ServerError(
			"missing_event_publisher_role",
			"Connection stack publisher role not found"
		);

	const events = new EventBridgeClient({
		credentials: input.credentials,
		region: input.region
	});
	const rule = `SSTConsoleStateEvents-${suffix}`;
	await events.send(
		new PutRuleCommand({
			Name: rule,
			State: "ENABLED",
			EventPattern: JSON.stringify({
				source: ["aws.s3"],
				detail: { bucket: { name: [input.bucket] } },
				$or: [
					{
						"detail-type": ["Object Created", "Object Deleted"],
						detail: { object: { key: [{ prefix: "app/" }] } }
					},
					{
						"detail-type": ["Object Created"],
						detail: { object: { key: [{ prefix: "update/" }] } }
					}
				]
			})
		})
	);
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
		throw new ServerError(
			"event_forwarding_target_failed",
			"Unable to configure state event forwarding target"
		);
}
