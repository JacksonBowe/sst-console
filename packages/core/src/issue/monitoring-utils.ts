import { createHash } from "node:crypto";

export const errorFilterPattern = [
	`?"Invoke Error"`,
	`?"Error: Runtime exited"`,
	`?"Task timed out after"`,
	`?"ERROR\t"`,
	`?"[ERROR]"`
].join(" ");

export type LambdaResource = {
	accountId: string;
	appName: string;
	stageName: string;
	functionName: string;
	functionArn: string;
	logGroup: string;
	region: string;
};

const issueWorkerFunctionNames = [
	"IssueIngressQueueSubscriber",
	"IssueReconcileQueueSubscriber"
];

/** Excludes Console Issue workers to prevent monitoring feedback loops. */
export function isIssueWorkerFunction(functionName: string) {
	return issueWorkerFunctionNames.some(name => functionName.includes(name));
}

/** Derives a Lambda log-group target from a physical SST Function resource. */
export function lambdaFromResource(resource: {
	accountId: string;
	appName: string;
	stageName: string;
	resourceKind: string;
	resourceType: string;
	normalizedArn?: string;
}): LambdaResource | undefined {
	if (
		resource.resourceKind !== "physical" ||
		resource.resourceType !== "sst.aws.Function" ||
		!resource.normalizedArn
	)
		return;
	const match = /^arn:[^:]+:lambda:([^:]+):(\d{12}):function:([^:]+)$/.exec(
		resource.normalizedArn
	);
	if (!match) return;
	const [, region, accountId, functionName] = match;
	if (!region || !accountId || !functionName) return;
	return {
		accountId,
		appName: resource.appName,
		stageName: resource.stageName,
		functionName,
		functionArn: resource.normalizedArn,
		logGroup: `/aws/lambda/${functionName}`,
		region
	};
}

/** Creates a stable CloudFormation stack name for an Issue subscriber. */
export function subscriberStackName(controlAccountId: string, stage: string) {
	return `SSTConsoleIssueSubscriber-${controlAccountId}-${stageHash(stage)}`;
}

/** Creates a stable regional IAM role name for an Issue subscriber. */
export function subscriberRoleName(
	controlAccountId: string,
	stage: string,
	region: string
) {
	return `SSTConsoleIssue-${controlAccountId}-${stageHash(stage)}-${region}`;
}

function stageHash(stage: string) {
	return createHash("sha256").update(stage).digest("hex").slice(0, 16);
}
