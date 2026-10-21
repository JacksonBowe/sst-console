import {
	CloudFormationClient,
	CreateStackCommand,
	DescribeStacksCommand,
	UpdateStackCommand
} from "@aws-sdk/client-cloudformation";
import {
	DeleteSubscriptionFilterCommand,
	PutSubscriptionFilterCommand,
	ResourceNotFoundException,
	CloudWatchLogsClient
} from "@aws-sdk/client-cloudwatch-logs";
import {
	GetFunctionConfigurationCommand,
	LambdaClient
} from "@aws-sdk/client-lambda";
import {
	GetQueueAttributesCommand,
	SendMessageCommand,
	SetQueueAttributesCommand,
	SQSClient
} from "@aws-sdk/client-sqs";
import { Resource } from "sst";

import { db } from "../db";
import { ServerError } from "../error";
import * as Connector from "../account/connector";
import * as App from "../app/app";
import { Stage } from "../app";
import {
	errorFilterPattern,
	isIssueWorkerFunction,
	lambdaFromResource,
	reconciliationAction,
	subscriberRoleName,
	subscriberStackName
} from "./monitoring-utils";
import { subscriberCode } from "./subscriber-code";
import * as Issue from "./issue";
import * as Subscription from "./issue.subscription";

export {
	errorFilterPattern,
	isIssueWorkerFunction,
	lambdaFromResource,
	reconciliationAction,
	subscriberRoleName,
	subscriberStackName
};

type QueueConfig = {
	stage: string;
	ingressQueueUrl: string;
	reconcileQueueUrl: string;
};

type IngressConfig = QueueConfig & {
	controlAccountId: string;
	queueArn: string;
	queueRegion: string;
};

/** Enables monitoring for a stage and schedules its initial setup. */
export async function enableStage(input: {
	appName: string;
	stageName: string;
}) {
	await Stage.get(input);
	const now = new Date().toISOString();
	await Stage.update({
		...input,
		issueMonitoringEnabled: true,
		updatedAt: now
	});
	await enqueueReconcile({ ...input, attempt: 0 });
}

/** Disables monitoring for a stage and schedules owned-filter removal. */
export async function disableStage(input: {
	appName: string;
	stageName: string;
}) {
	await Stage.get(input);
	const now = new Date().toISOString();
	await Stage.update({
		...input,
		issueMonitoringEnabled: false,
		updatedAt: now
	});
	await enqueueReconcile({ ...input, attempt: 0 });
}

/** Disables monitoring for every Stage where monitoring is currently enabled. */
export async function disableAllStages() {
	const apps = await App.list({ summaries: false });
	const stages = (
		await Promise.all(apps.map(app => Stage.list({ appName: app.appName })))
	).flat();
	const enabledStages = stages.filter(stage => stage.issueMonitoringEnabled);
	await Promise.all(
		enabledStages.map(stage =>
			disableStage({
				appName: stage.appName,
				stageName: stage.stageName
			})
		)
	);
	return { disabled: enabledStages.length };
}

/** Schedules reconciliation only when monitoring remains enabled for a stage. */
export async function requestReconcile(input: {
	appName: string;
	stageName: string;
}) {
	const stage = await Stage.get(input);
	if (!stage?.issueMonitoringEnabled) return;
	await enqueueReconcile({ ...input, attempt: 0 });
}

/** Returns stage monitoring, subscription, and Issue records for the API. */
export async function getStageStatus(input: {
	appName: string;
	stageName: string;
}) {
	const stage = await Stage.get(input);
	const [subscriptions, issues] = await Promise.all([
		Subscription.list(input),
		Issue.list(input)
	]);
	return {
		monitoring: { enabled: stage.issueMonitoringEnabled === true },
		subscriptions,
		issues
	};
}

/** Removes one stage's remote filters and all local Issue operational data. */
export async function removeStageMonitoring(input: {
	appName: string;
	stageName: string;
}) {
	const subscriptions = await Subscription.list(input);
	if (subscriptions.length > 0) {
		const stage = await Stage.get(input);
		const account = await db.entities.account
			.get({ accountId: stage.accountId })
			.go({ consistent: true });
		if (!account.data || account.data.status !== "connected")
			throw new ServerError(
				"issue_monitoring_cleanup_unavailable",
				"Connected workload account is unavailable for Issue filter cleanup"
			);
		const connection = await Connector.assume({
			roleArn: account.data.roleArn,
			region: account.data.region
		});
		await removeSubscriptions({
			input,
			credentials: connection.credentials
		});
	}
	await deleteStageIssueData(input);
}

/** Reconciles one Stage's filters with its current monitoring setting. */
export async function reconcileStage(input: {
	appName: string;
	stageName: string;
	attempt: number;
}) {
	console.log("Reconciling Issue monitoring", input);
	const stage = await Stage.get(input);
	const existingSubscriptions = await Subscription.list(input);
	const action = reconciliationAction(
		stage.issueMonitoringEnabled,
		existingSubscriptions.length > 0
	);
	if (action === "noop") return;
	const account = await db.entities.account
		.get({ accountId: stage.accountId })
		.go({ consistent: true });
	if (!account.data || account.data.status !== "connected") {
		console.log("Skipping Issue reconciliation: account is not connected", {
			accountId: stage.accountId,
			status: account.data?.status
		});
		return;
	}
	const connection = await Connector.assume({
		roleArn: account.data.roleArn,
		region: account.data.region
	});
	if (action === "disconnect") {
		await removeSubscriptions({
			input,
			credentials: connection.credentials,
			subscriptions: existingSubscriptions
		});
		return;
	}
	const config = await ingressConfig();
	await ensureIngressQueuePolicy(config);
	const resources = await lambdaResources(
		input.appName,
		input.stageName,
		connection.credentials
	);
	const desiredLogGroups = new Set(
		resources.map(resource => resource.logGroup)
	);
	const staleSubscriptions = existingSubscriptions.filter(
		subscription =>
			subscription.status !== "removed" &&
			!desiredLogGroups.has(subscription.logGroup)
	);
	if (staleSubscriptions.length > 0) {
		console.log("Removing stale Issue log subscriptions", {
			appName: input.appName,
			stageName: input.stageName,
			count: staleSubscriptions.length
		});
		await removeSubscriptions({
			input,
			credentials: connection.credentials,
			subscriptions: staleSubscriptions
		});
	}
	console.log("Found Lambda resources for Issue monitoring", {
		appName: input.appName,
		stageName: input.stageName,
		count: resources.length
	});
	for (const [region, regionalResources] of Map.groupBy(
		resources,
		item => item.region
	)) {
		if (!region || !regionalResources) continue;
		console.log("Ensuring regional Issue subscriber", {
			accountId: stage.accountId,
			region,
			resourceCount: regionalResources.length
		});
		const subscriber = await ensureSubscriber({
			accountId: stage.accountId,
			config,
			credentials: connection.credentials,
			region
		});
		if (!subscriber) {
			console.log("Issue subscriber is still being created", {
				accountId: stage.accountId,
				region,
				attempt: input.attempt
			});
			if (input.attempt < 8)
				await enqueueReconcile(
					{
						...input,
						attempt: input.attempt + 1
					},
					60
				);
			continue;
		}
		const logs = new CloudWatchLogsClient({
			credentials: connection.credentials,
			region
		});
		for (const resource of regionalResources) {
			const now = new Date().toISOString();
			try {
				await putSubscription({
					config,
					input,
					resource,
					status: "pending",
					updatedAt: now
				});
				await logs.send(
					new PutSubscriptionFilterCommand({
						destinationArn: subscriber,
						filterName: subscriptionFilterName(config),
						filterPattern: errorFilterPattern,
						logGroupName: resource.logGroup
					})
				);
				await putSubscription({
					config,
					input,
					resource,
					status: "attached",
					updatedAt: now
				});
				console.log("Attached Issue log subscription", {
					logGroup: resource.logGroup,
					region
				});
			} catch (error) {
				const pending = error instanceof ResourceNotFoundException;
				await putSubscription({
					config,
					input,
					resource,
					status: pending ? "pending" : "failed",
					lastError: errorMessage(error),
					updatedAt: now
				});
				console.log("Failed to attach Issue log subscription", {
					logGroup: resource.logGroup,
					region,
					pending,
					error: errorMessage(error)
				});
			}
		}
	}
}

/** Removes only subscriptions persisted as owned by this stage. */
async function removeSubscriptions(input: {
	input: { appName: string; stageName: string };
	credentials: Awaited<ReturnType<typeof Connector.assume>>["credentials"];
	subscriptions?: Array<{
		appName: string;
		stageName: string;
		region: string;
		logGroup: string;
		filterName: string;
	}>;
}) {
	const subscriptions =
		input.subscriptions ?? (await Subscription.list(input.input));
	for (const subscription of subscriptions) {
		if (!subscription) continue;
		const logs = new CloudWatchLogsClient({
			credentials: input.credentials,
			region: subscription.region
		});
		await logs
			.send(
				new DeleteSubscriptionFilterCommand({
					filterName: subscription.filterName,
					logGroupName: subscription.logGroup
				})
			)
			.catch(error => {
				if (error.name !== "ResourceNotFoundException") throw error;
			});
		await Subscription.update({
			appName: subscription.appName,
			stageName: subscription.stageName,
			region: subscription.region,
			logGroup: subscription.logGroup,
			status: "removed",
			updatedAt: new Date().toISOString(),
			lastError: null
		});
	}
}

/** Deletes all local Issue records after their remote filters are removed. */
async function deleteStageIssueData(input: {
	appName: string;
	stageName: string;
}) {
	const [subscriptions, issues, ingressEvents] = await Promise.all([
		Subscription.list(input),
		Issue.list(input),
		Issue.listIngressEvents(input)
	]);
	for (const subscription of subscriptions)
		await Subscription.remove(subscription);
	for (const issue of issues) await Issue.remove(issue);
	for (const event of ingressEvents) await Issue.removeIngressEvent(event);
}

/** Reads configured log groups for current physical SST Lambda resources. */
async function lambdaResources(
	appName: string,
	stageName: string,
	credentials: Awaited<ReturnType<typeof Connector.assume>>["credentials"]
) {
	const resources = await db.entities.resource.query
		.resource({ appName, stageName })
		.go({ pages: "all" });
	const lambdas = resources.data.flatMap(resource => {
		const lambda = lambdaFromResource(resource);
		return lambda && !isIssueWorkerFunction(lambda.functionName)
			? [lambda]
			: [];
	});
	return Promise.all(
		lambdas.map(async lambda => {
			const configuration = await new LambdaClient({
				credentials,
				region: lambda.region
			}).send(
				new GetFunctionConfigurationCommand({
					FunctionName: lambda.functionArn
				})
			);
			return {
				...lambda,
				logGroup:
					configuration.LoggingConfig?.LogGroup ?? lambda.logGroup
			};
		})
	);
}

/** Creates or reads the regional workload subscriber CloudFormation stack. */
async function ensureSubscriber(input: {
	accountId: string;
	config: IngressConfig;
	credentials: Awaited<ReturnType<typeof Connector.assume>>["credentials"];
	region: string;
}): Promise<string | undefined> {
	const stackName = subscriberStackName(
		input.config.controlAccountId,
		input.config.stage
	);
	const roleName = subscriberRoleName(
		input.config.controlAccountId,
		input.config.stage,
		input.region
	);
	const cloudformation = new CloudFormationClient({
		credentials: input.credentials,
		region: input.region
	});
	const stack = await cloudformation
		.send(new DescribeStacksCommand({ StackName: stackName }))
		.then(result => result.Stacks?.[0])
		.catch(error => {
			if (error.name === "ValidationError") return undefined;
			throw error;
		});
	if (!stack) {
		console.log("Creating Issue subscriber stack", {
			accountId: input.accountId,
			region: input.region,
			stackName
		});
		await cloudformation.send(
			new CreateStackCommand({
				StackName: stackName,
				TemplateBody: subscriberTemplate(
					input.config,
					stackName,
					roleName
				),
				Capabilities: ["CAPABILITY_NAMED_IAM"]
			})
		);
		await putSubscriber({ ...input, stackName, status: "pending" });
		return;
	}
	if (stack.StackStatus?.endsWith("_IN_PROGRESS")) {
		console.log("Issue subscriber stack is in progress", {
			accountId: input.accountId,
			region: input.region,
			stackName,
			status: stack.StackStatus
		});
		await putSubscriber({ ...input, stackName, status: "pending" });
		return;
	}
	const functionArn = stack.Outputs?.find(
		output => output.OutputKey === "FunctionArn"
	)?.OutputValue;
	if (stack.StackStatus === "CREATE_COMPLETE" && functionArn) {
		const updated = await cloudformation
			.send(
				new UpdateStackCommand({
					StackName: stackName,
					TemplateBody: subscriberTemplate(
						input.config,
						stackName,
						roleName
					),
					Capabilities: ["CAPABILITY_NAMED_IAM"]
				})
			)
			.then(() => true)
			.catch(error => {
				if (
					error.name === "ValidationError" &&
					/No updates/.test(error.message)
				)
					return false;
				throw error;
			});
		if (updated) {
			console.log("Updating Issue subscriber stack", {
				accountId: input.accountId,
				region: input.region,
				stackName
			});
			await putSubscriber({ ...input, stackName, status: "pending" });
			return;
		}
		console.log("Issue subscriber stack is ready", {
			accountId: input.accountId,
			region: input.region,
			stackName,
			functionArn
		});
		await putSubscriber({
			...input,
			stackName,
			status: "ready",
			functionArn
		});
		return functionArn;
	}
	await putSubscriber({
		...input,
		stackName,
		status: "failed",
		lastError: `CloudFormation stack is ${stack.StackStatus ?? "unknown"}`
	});
	console.log("Issue subscriber stack failed", {
		accountId: input.accountId,
		region: input.region,
		stackName,
		status: stack.StackStatus
	});
	throw new ServerError(
		"issue_subscriber_failed",
		`Issue subscriber stack is ${stack.StackStatus ?? "unknown"}`
	);
}

/** Persists current regional subscriber stack state. */
async function putSubscriber(input: {
	accountId: string;
	region: string;
	stackName: string;
	status: "pending" | "ready" | "failed";
	functionArn?: string;
	lastError?: string;
}) {
	await Subscription.upsertSubscriber({
		...input,
		updatedAt: new Date().toISOString()
	});
}

/** Persists setup status for one Console-owned log subscription filter. */
async function putSubscription(input: {
	config: IngressConfig;
	input: { appName: string; stageName: string };
	resource: Awaited<ReturnType<typeof lambdaResources>>[number];
	status: "pending" | "attached" | "failed";
	lastError?: string;
	updatedAt: string;
}) {
	if (!input.resource) return;
	await Subscription.upsert({
		appName: input.input.appName,
		stageName: input.input.stageName,
		accountId: input.resource.accountId,
		region: input.resource.region,
		logGroup: input.resource.logGroup,
		filterName: subscriptionFilterName(input.config),
		functionArn: input.resource.functionArn,
		status: input.status,
		lastError: input.lastError,
		updatedAt: input.updatedAt
	});
}

/** Names Console-owned filters with their owning Console installation. */
function subscriptionFilterName(config: IngressConfig) {
	return `sst-console#${config.controlAccountId}#${config.stage}`;
}

/** Queues a delayed monitoring reconciliation for one Stage. */
async function enqueueReconcile(
	input: {
		appName: string;
		stageName: string;
		attempt: number;
	},
	delaySeconds = 0
) {
	const config = queueConfig();
	await new SQSClient({}).send(
		new SendMessageCommand({
			QueueUrl: config.reconcileQueueUrl,
			MessageBody: JSON.stringify(input),
			DelaySeconds: delaySeconds
		})
	);
}

/** Grants connected workload subscriber roles access to central ingress SQS. */
async function ensureIngressQueuePolicy(config: IngressConfig) {
	const accounts = await db.entities.account.query
		.byType({})
		.go({ pages: "all" });
	const partition = config.queueArn.split(":")[1] ?? "aws";
	const rolePattern = subscriberRoleName(
		config.controlAccountId,
		config.stage,
		"*"
	);
	const accountIds = accounts.data
		.filter(account => account.status === "connected")
		.map(account => account.accountId);
	await new SQSClient({}).send(
		new SetQueueAttributesCommand({
			QueueUrl: config.ingressQueueUrl,
			Attributes: {
				Policy: JSON.stringify({
					Version: "2012-10-17",
					Statement: accountIds.length
						? [
								{
									Effect: "Allow",
									Principal: {
										AWS: accountIds.map(
											accountId =>
												`arn:${partition}:iam::${accountId}:root`
										)
									},
									Action: "sqs:SendMessage",
									Resource: config.queueArn,
									Condition: {
										ArnLike: {
											"aws:PrincipalArn": accountIds.map(
												accountId =>
													`arn:${partition}:iam::${accountId}:role/${rolePattern}`
											)
										}
									}
								}
							]
						: []
				})
			}
		})
	);
}

/** Reads Issue queue bindings and application configuration. */
function queueConfig(): QueueConfig {
	const config = {
		stage: process.env.SST_CONSOLE_ISSUE_STAGE,
		ingressQueueUrl: Resource.IssueIngressQueue.url,
		reconcileQueueUrl: Resource.IssueReconcileQueue.url
	};
	if (Object.values(config).some(value => !value))
		throw new ServerError(
			"issue_ingress_not_configured",
			"Issue ingress infrastructure is not configured"
		);
	return config as QueueConfig;
}

/** Resolves ingress queue metadata needed for cross-account policy management. */
async function ingressConfig(): Promise<IngressConfig> {
	const config = queueConfig();
	const response = await new SQSClient({}).send(
		new GetQueueAttributesCommand({
			QueueUrl: config.ingressQueueUrl,
			AttributeNames: ["QueueArn"]
		})
	);
	const queueArn = response.Attributes?.QueueArn;
	const [, partition, , queueRegion, controlAccountId] =
		queueArn?.split(":") ?? [];
	if (!queueArn || !partition || !queueRegion || !controlAccountId)
		throw new ServerError(
			"issue_ingress_not_configured",
			"Issue ingress infrastructure is not configured"
		);
	return { ...config, controlAccountId, queueArn, queueRegion };
}

/** Generates regional subscriber CloudFormation resources and permissions. */
function subscriberTemplate(
	config: IngressConfig,
	stackName: string,
	roleName: string
) {
	return JSON.stringify({
		AWSTemplateFormatVersion: "2010-09-09",
		Description: `Receive CloudWatch Lambda failures for SST Console hosted in AWS account "${config.controlAccountId}", stage "${config.stage}".`,
		Resources: {
			SubscriberRole: {
				Type: "AWS::IAM::Role",
				Properties: {
					RoleName: roleName,
					Description: `SST Console Issue subscriber role for Console hosted in AWS account "${config.controlAccountId}", stage "${config.stage}".`,
					AssumeRolePolicyDocument: {
						Version: "2012-10-17",
						Statement: [
							{
								Effect: "Allow",
								Principal: { Service: "lambda.amazonaws.com" },
								Action: "sts:AssumeRole"
							}
						]
					},
					ManagedPolicyArns: [
						"arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
					],
					Policies: [
						{
							PolicyName: "SendIssueIngress",
							PolicyDocument: {
								Version: "2012-10-17",
								Statement: [
									{
										Effect: "Allow",
										Action: "sqs:SendMessage",
										Resource: config.queueArn
									}
								]
							}
						}
					]
				}
			},
			Subscriber: {
				Type: "AWS::Lambda::Function",
				Properties: {
					FunctionName: stackName,
					Code: { ZipFile: subscriberCode },
					Environment: {
						Variables: {
							SST_CONSOLE_ISSUE_QUEUE_REGION:
								process.env.AWS_REGION,
							SST_CONSOLE_ISSUE_QUEUE_URL: config.ingressQueueUrl
						}
					},
					Handler: "index.handler",
					MemorySize: 256,
					Role: { "Fn::GetAtt": ["SubscriberRole", "Arn"] },
					Runtime: "nodejs22.x",
					Timeout: 30
				}
			},
			SubscriberPermission: {
				Type: "AWS::Lambda::Permission",
				Properties: {
					Action: "lambda:InvokeFunction",
					FunctionName: { Ref: "Subscriber" },
					Principal: "logs.amazonaws.com",
					SourceArn: {
						"Fn::Sub":
							"arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}:log-group:*"
					}
				}
			}
		},
		Outputs: {
			FunctionArn: { Value: { "Fn::GetAtt": ["Subscriber", "Arn"] } }
		}
	});
}

/** Converts an unknown AWS failure into bounded persisted status text. */
function errorMessage(error: unknown) {
	return error instanceof Error
		? error.message.slice(0, 1_000)
		: String(error).slice(0, 1_000);
}
