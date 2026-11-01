import { beforeEach, describe, expect, it, vi } from "vitest";
import { DescribeStackResourceCommand } from "@aws-sdk/client-cloudformation";
import { PutRuleCommand, PutTargetsCommand } from "@aws-sdk/client-eventbridge";

const { cloud, events } = vi.hoisted(() => ({
	cloud: vi.fn(),
	events: vi.fn()
}));
vi.mock("@aws-sdk/client-cloudformation", async importOriginal => ({
	...(await importOriginal<
		typeof import("@aws-sdk/client-cloudformation")
	>()),
	CloudFormationClient: class {
		send = cloud;
	}
}));
vi.mock("@aws-sdk/client-eventbridge", async importOriginal => ({
	...(await importOriginal<typeof import("@aws-sdk/client-eventbridge")>()),
	EventBridgeClient: class {
		send = events;
	}
}));

const { configureForwarding } = await import("../../src/account/forwarding");
const input = {
	accountId: "111111111111",
	roleArn:
		"arn:aws:iam::111111111111:role/SSTConsoleRole-222222222222-0123456789abcdef",
	region: "us-east-1",
	credentials: {
		accessKeyId: "test",
		secretAccessKey: "test",
		sessionToken: undefined
	},
	bucket: "state-bucket",
	busArn: "arn:aws:events:us-east-1:222222222222:event-bus/console"
};

describe("workload event forwarding", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		cloud.mockResolvedValue({
			StackResourceDetail: { PhysicalResourceId: "publisher" }
		});
		events.mockResolvedValue({});
	});

	it("provisions precise rule and cross-account target", async () => {
		await configureForwarding(input);
		expect(cloud.mock.calls[0]![0]).toBeInstanceOf(
			DescribeStackResourceCommand
		);
		expect(cloud.mock.calls[0]![0].input).toEqual({
			StackName: "SSTConsoleConnection-222222222222-0123456789abcdef",
			LogicalResourceId: "SSTConsoleEventPublisherRole"
		});
		const rule = events.mock.calls[0]![0];
		expect(rule).toBeInstanceOf(PutRuleCommand);
		expect(JSON.parse(rule.input.EventPattern)).toEqual({
			source: ["aws.s3"],
			detail: { bucket: { name: ["state-bucket"] } },
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
		});
		const target = events.mock.calls[1]![0];
		expect(target).toBeInstanceOf(PutTargetsCommand);
		expect(target.input).toEqual({
			Rule: rule.input.Name,
			Targets: [
				{
					Id: "SSTConsoleStateEvents",
					Arn: input.busArn,
					RoleArn: "arn:aws:iam::111111111111:role/publisher"
				}
			]
		});
	});

	it("reconciles same rule on repeat and bucket change", async () => {
		await configureForwarding(input);
		await configureForwarding(input);
		await configureForwarding({ ...input, bucket: "new-bucket" });
		const rules = events.mock.calls
			.map(call => call[0])
			.filter(command => command instanceof PutRuleCommand);
		expect(rules.map(rule => rule.input.Name)).toEqual([
			rules[0]!.input.Name,
			rules[0]!.input.Name,
			rules[0]!.input.Name
		]);
		expect(
			JSON.parse(rules[2]!.input.EventPattern!).detail.bucket.name
		).toEqual(["new-bucket"]);
	});

	it("matches only supported bucket, event, and key combinations", async () => {
		await configureForwarding(input);
		const pattern = JSON.parse(events.mock.calls[0]![0].input.EventPattern);
		const matches = (
			source: string,
			bucket: string,
			type: string,
			key: string
		) =>
			pattern.source.includes(source) &&
			pattern.detail.bucket.name.includes(bucket) &&
			pattern.$or.some(
				(branch: {
					"detail-type": string[];
					detail: { object: { key: { prefix: string }[] } };
				}) =>
					branch["detail-type"].includes(type) &&
					branch.detail.object.key.some(item =>
						key.startsWith(item.prefix)
					)
			);
		expect(
			matches("aws.s3", input.bucket, "Object Created", "app/a/b.json")
		).toBe(true);
		expect(
			matches("aws.s3", input.bucket, "Object Deleted", "app/a/b.json")
		).toBe(true);
		expect(
			matches(
				"aws.s3",
				input.bucket,
				"Object Created",
				"update/a/b/1.json"
			)
		).toBe(true);
		expect(
			matches(
				"aws.s3",
				input.bucket,
				"Object Deleted",
				"update/a/b/1.json"
			)
		).toBe(false);
		expect(
			matches("aws.s3", "other", "Object Created", "app/a/b.json")
		).toBe(false);
		expect(
			matches(
				"aws.s3",
				input.bucket,
				"Object Created",
				"snapshot/a/b.json"
			)
		).toBe(false);
		expect(
			matches(
				"aws.s3",
				input.bucket,
				"Object Restore Completed",
				"app/a/b.json"
			)
		).toBe(false);
		expect(
			matches("other", input.bucket, "Object Created", "app/a/b.json")
		).toBe(false);
	});

	it("propagates AWS failures and rejects partial target failures", async () => {
		cloud.mockRejectedValueOnce(new Error("cloud failure"));
		await expect(configureForwarding(input)).rejects.toThrow(
			"cloud failure"
		);
		events.mockRejectedValueOnce(new Error("rule failure"));
		await expect(configureForwarding(input)).rejects.toThrow(
			"rule failure"
		);
		events
			.mockResolvedValueOnce({})
			.mockRejectedValueOnce(new Error("target failure"));
		await expect(configureForwarding(input)).rejects.toThrow(
			"target failure"
		);
		events
			.mockResolvedValueOnce({})
			.mockResolvedValueOnce({ FailedEntryCount: 1 });
		await expect(configureForwarding(input)).rejects.toThrow(
			"Unable to configure state event forwarding target"
		);
	});
});
