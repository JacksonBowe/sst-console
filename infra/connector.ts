import { consoleArtifacts } from "./artifacts.ts";
import { bus } from "./bus.ts";
import { connectionStackName } from "./connection-name.ts";
import {
	assumeAccountRolePermission,
	consoleInstallationDescription,
	connectorRoleName,
	controlAccountId,
	externalId
} from "./console";
import { consoleConnections, consoleData } from "./storage";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const region = aws.getRegionOutput().name;
const registrationHandler = readFileSync(
	"./infra/assets/connector-callback.js",
	"utf8"
);
const connectorEvent = new sst.aws.Function("ConnectorEvent", {
	handler: "packages/functions/src/events/connector.handler",
	url: { authorization: "iam" },
	link: [bus, consoleData, consoleConnections],
	environment: {
		SST_CONSOLE_EXTERNAL_ID: externalId
	},
	permissions: [
		assumeAccountRolePermission,
		{
			actions: ["events:PutPermission", "events:RemovePermission"],
			resources: [bus.arn]
		}
	]
});

new aws.lambda.Permission("ConnectorEventUrlPermission", {
	action: "lambda:InvokeFunctionUrl",
	function: connectorEvent.arn,
	functionUrlAuthType: "AWS_IAM",
	principal: "*"
});

new aws.lambda.Permission("ConnectorEventInvokePermission", {
	action: "lambda:InvokeFunction",
	function: connectorEvent.arn,
	invokedViaFunctionUrl: true,
	principal: "*"
});

const templateWithoutFingerprint = $jsonStringify({
	AWSTemplateFormatVersion: "2010-09-09",
	Description: $interpolate`Connect this AWS account to ${consoleInstallationDescription}`,
	Parameters: {
		ControlAccountId: {
			Type: "String",
			Description: "AWS account ID hosting this SST Console installation."
		},
		CallbackFunctionArn: {
			Type: "String",
			Description:
				"The SST Console callback Lambda ARN used for connector registration."
		},
		ExternalId: {
			Type: "String",
			Description:
				"The SST Console installation external ID. Do not change this value."
		},
		ConsoleEventBusArn: {
			Type: "String",
			Description: "EventBridge bus ARN receiving SST state updates."
		}
	},
	Resources: {
		SSTConsoleRole: {
			Type: "AWS::IAM::Role",
			Properties: {
				RoleName: connectorRoleName,
				Description: $interpolate`SST Console connector role for ${consoleInstallationDescription}`,
				AssumeRolePolicyDocument: {
					Version: "2012-10-17",
					Statement: [
						{
							Effect: "Allow",
							Principal: {
								AWS: {
									"Fn::Sub":
										"arn:${AWS::Partition}:iam::${ControlAccountId}:root"
								}
							},
							Action: "sts:AssumeRole",
							Condition: {
								StringEquals: {
									"sts:ExternalId": { Ref: "ExternalId" }
								}
							}
						}
					]
				},
				ManagedPolicyArns: [
					"arn:aws:iam::aws:policy/AdministratorAccess"
				]
			}
		},
		SSTConsoleRegistrationRole: {
			Type: "AWS::IAM::Role",
			Properties: {
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
						PolicyName: "InvokeConsoleConnectorCallback",
						PolicyDocument: {
							Version: "2012-10-17",
							Statement: [
								{
									Effect: "Allow",
									Action: [
										"lambda:InvokeFunctionUrl",
										"lambda:InvokeFunction"
									],
									Resource: {
										Ref: "CallbackFunctionArn"
									}
								}
							]
						}
					}
				]
			}
		},
		SSTConsoleEventPublisherRole: {
			Type: "AWS::IAM::Role",
			Properties: {
				AssumeRolePolicyDocument: {
					Version: "2012-10-17",
					Statement: [
						{
							Effect: "Allow",
							Principal: { Service: "events.amazonaws.com" },
							Action: "sts:AssumeRole"
						}
					]
				},
				Policies: [
					{
						PolicyName: "PublishConsoleStateEvents",
						PolicyDocument: {
							Version: "2012-10-17",
							Statement: [
								{
									Effect: "Allow",
									Action: "events:PutEvents",
									Resource: { Ref: "ConsoleEventBusArn" }
								}
							]
						}
					}
				]
			}
		},
		SSTConsoleRegistrationFunction: {
			Type: "AWS::Lambda::Function",
			Properties: {
				Role: {
					"Fn::GetAtt": ["SSTConsoleRegistrationRole", "Arn"]
				},
				Runtime: "nodejs22.x",
				Handler: "index.handler",
				Timeout: 30,
				Code: {
					ZipFile: registrationHandler
				}
			}
		},
		SSTConsoleRegistration: {
			Type: "Custom::SSTConsoleRegistration",
			DependsOn: ["SSTConsoleRole", "SSTConsoleEventPublisherRole"],
			Properties: {
				ServiceToken: {
					"Fn::GetAtt": ["SSTConsoleRegistrationFunction", "Arn"]
				},
				AccountId: { Ref: "AWS::AccountId" },
				CallbackUrl: connectorEvent.url,
				CallbackFunctionArn: connectorEvent.arn,
				Region: { Ref: "AWS::Region" },
				RoleArn: {
					"Fn::GetAtt": ["SSTConsoleRole", "Arn"]
				}
			}
		}
	},
	Outputs: {
		RoleArn: {
			Description: "Role assumed by SST Console to access this account.",
			Value: {
				"Fn::GetAtt": ["SSTConsoleRole", "Arn"]
			}
		},
		AccountId: {
			Description: "The connected AWS account ID.",
			Value: {
				Ref: "AWS::AccountId"
			}
		}
	}
});

export const connectorFingerprint = templateWithoutFingerprint.apply(template =>
	createHash("sha256").update(template).digest("hex")
);
const connectorTemplate = $resolve({
	template: templateWithoutFingerprint,
	fingerprint: connectorFingerprint
}).apply(({ template, fingerprint }) => {
	const parsed = JSON.parse(template);
	parsed.Outputs.ConnectorTemplateFingerprint = {
		Description: "SST Console connector template fingerprint.",
		Value: fingerprint
	};
	return JSON.stringify(parsed);
});

const connectorTemplateObject = new aws.s3.BucketObjectv2("ConnectorTemplate", {
	bucket: consoleArtifacts.name,
	key: connectorFingerprint.apply(hash => `connect/${hash}/template.json`),
	contentType: "application/json",
	content: connectorTemplate
});

export const connectorTemplateUrl = $interpolate`https://${consoleArtifacts.nodes.bucket.bucketRegionalDomainName}/${connectorTemplateObject.key}`;

export const connectorReconciler = new sst.aws.Function("ConnectorReconciler", {
	handler: "packages/functions/src/events/connector-reconcile.handler",
	timeout: "15 minutes",
	link: [consoleData, consoleConnections],
	environment: {
		SST_CONSOLE_EXTERNAL_ID: externalId,
		SST_CONSOLE_CONNECTOR_STACK_NAME: controlAccountId.apply(accountId =>
			connectionStackName(accountId, $app.stage)
		)
	},
	permissions: [assumeAccountRolePermission]
});

if (!$dev) {
	// Invocation waits for update requests, not stack completion. Failed stack
	// updates need manual attention; redeploying unchanged input won't retry them.
	new aws.lambda.Invocation(
		"ConnectorReconcileInvocation",
		{
			functionName: connectorReconciler.name,
			input: $jsonStringify({
				fingerprint: connectorFingerprint,
				templateUrl: connectorTemplateUrl
			})
		},
		{ dependsOn: [connectorTemplateObject] }
	);
}
export const connectorQuickCreateUrl = $resolve({
	externalId,
	stage: $app.stage,
	region,
	templateUrl: connectorTemplateUrl,
	controlAccountId,
	callbackFunctionArn: connectorEvent.arn,
	consoleEventBusArn: bus.arn
}).apply(
	({
		externalId,
		stage,
		region,
		templateUrl,
		controlAccountId,
		callbackFunctionArn,
		consoleEventBusArn
	}) => {
		const query = new URLSearchParams({
			templateURL: templateUrl,
			stackName: connectionStackName(controlAccountId, stage),
			param_ControlAccountId: controlAccountId,
			param_CallbackFunctionArn: callbackFunctionArn,
			param_ExternalId: externalId,
			param_ConsoleEventBusArn: consoleEventBusArn
		});

		return `https://${region}.console.aws.amazon.com/cloudformation/home?region=${region}#/stacks/create/review?${query.toString()}`;
	}
);
