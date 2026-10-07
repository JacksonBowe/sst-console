import { describe, expect, it } from "vitest";

import {
	errorFilterPattern,
	lambdaFromResource,
	subscriberStackName
} from "../../src/issue/monitoring-utils";
import { issueSubscriptionEntity } from "../../src/issue/issue.dynamo";
import { subscriberCode } from "../../src/issue/subscriber-code";

describe("Issue monitoring", () => {
	it("selects physical SST Lambda resources", () => {
		expect(
			lambdaFromResource({
				accountId: "123456789012",
				appName: "console",
				stageName: "prod",
				resourceKind: "physical",
				resourceType: "sst.aws.Function",
				normalizedArn:
					"arn:aws:lambda:ap-southeast-2:123456789012:function:console-prod-api"
			})
		).toEqual({
			accountId: "123456789012",
			appName: "console",
			stageName: "prod",
			functionName: "console-prod-api",
			functionArn:
				"arn:aws:lambda:ap-southeast-2:123456789012:function:console-prod-api",
			logGroup: "/aws/lambda/console-prod-api",
			region: "ap-southeast-2"
		});
	});

	it("ignores non-Lambda and qualified Lambda ARNs", () => {
		expect(
			lambdaFromResource({
				accountId: "123456789012",
				appName: "console",
				stageName: "prod",
				resourceKind: "physical",
				resourceType: "sst.aws.Dynamo",
				normalizedArn:
					"arn:aws:dynamodb:ap-southeast-2:123456789012:table/console-prod"
			})
		).toBeUndefined();
		expect(
			lambdaFromResource({
				accountId: "123456789012",
				appName: "console",
				stageName: "prod",
				resourceKind: "physical",
				resourceType: "sst.aws.Function",
				normalizedArn:
					"arn:aws:lambda:ap-southeast-2:123456789012:function:console-prod-api:live"
			})
		).toBeUndefined();
	});

	it("uses stable owned subscription identifiers and OC-parity error signals", () => {
		expect(
			subscriberStackName(
				"sst-console:123456789012:dev",
				"ap-southeast-2"
			)
		).toBe("SSTConsoleIssueSubscriber-35ae3cf9a2c1-ap-southeast-2");
		expect(errorFilterPattern).toContain('"Task timed out after"');
		expect(errorFilterPattern).toContain('"Error: Runtime exited"');
		expect(errorFilterPattern).toContain('"ERROR\t"');
		expect(errorFilterPattern).toContain('"[ERROR]"');
	});

	it("uses regional SQS delivery without a public ingress endpoint", () => {
		expect(subscriberCode).toContain('require("@aws-sdk/client-sqs")');
		expect(subscriberCode).toContain("SendMessageBatchCommand");
		expect(subscriberCode).toContain("exports.handler");
		expect(subscriberCode).not.toContain("sts:GetCallerIdentity");
	});

	it("indexes subscriptions by CloudWatch source", () => {
		const params = issueSubscriptionEntity.query
			.bySource({
				accountId: "123456789012",
				region: "ap-southeast-2",
				logGroup: "/aws/lambda/console-prod-api"
			})
			.params({ table: "ConsoleData" });
		expect(params.IndexName).toBe("issueSubscriptionsBySource");
		expect(params.KeyConditionExpression).toContain("#pk");
	});
});
