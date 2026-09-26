import { api } from "./api";
import { externalId } from "./console";
import { consoleConnections, consoleData } from "./storage";
import { readFileSync } from "node:fs";

const region = aws.getRegionOutput().name;
const registrationHandler = readFileSync(
	"./infra/assets/connector-callback.js",
	"utf8"
);
const connectorTemplates = new sst.aws.Bucket("ConnectorTemplates", {
	access: "public"
});

const connectorEvent = new sst.aws.Function("ConnectorEvent", {
	handler: "packages/functions/src/events/connector.handler",
	url: { authorization: "iam" },
	link: [consoleData, consoleConnections],
	environment: {
		SST_CONSOLE_EXTERNAL_ID: externalId
	},
	permissions: [
		{
			actions: ["sts:AssumeRole"],
			resources: ["arn:aws:iam::*:role/SSTConsoleRole"]
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

new aws.s3.BucketObjectv2("ConnectorTemplate", {
	bucket: connectorTemplates.name,
	key: "connect/template.json",
	contentType: "application/json",
	content: $jsonStringify({
		AWSTemplateFormatVersion: "2010-09-09",
		Description:
			"Connect this AWS account to a self-hosted SST Console installation.",
		Parameters: {
			CollectorRoleArn: {
				Type: "String",
				Description:
					"The SST Console API role ARN from the control account."
			},
			RegistrationRoleArn: {
				Type: "String",
				Description:
					"The SST Console connector registration role ARN from the control account."
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
			}
		},
		Resources: {
			SSTConsoleRole: {
				Type: "AWS::IAM::Role",
				Properties: {
					RoleName: "SSTConsoleRole",
					AssumeRolePolicyDocument: {
						Version: "2012-10-17",
						Statement: [
							{
								Effect: "Allow",
								Principal: {
									AWS: [
										{ Ref: "CollectorRoleArn" },
										{ Ref: "RegistrationRoleArn" }
									]
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
				DependsOn: ["SSTConsoleRole"],
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
				Description:
					"Role assumed by SST Console to access this account.",
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
	})
});

const connectorTemplateUrl = $interpolate`https://${connectorTemplates.nodes.bucket.bucketRegionalDomainName}/connect/template.json`;
const connectorQuickCreateUrl = $resolve({
	region,
	templateUrl: connectorTemplateUrl,
	collectorRoleArn: api.nodes.role.arn,
	registrationRoleArn: connectorEvent.nodes.role.arn,
	callbackFunctionArn: connectorEvent.arn,
	externalId
}).apply(
	({
		region,
		templateUrl,
		collectorRoleArn,
		registrationRoleArn,
		callbackFunctionArn,
		externalId
	}) => {
		const query = new URLSearchParams({
			templateURL: templateUrl,
			stackName: "SSTConsoleConnection",
			param_CollectorRoleArn: collectorRoleArn,
			param_RegistrationRoleArn: registrationRoleArn,
			param_CallbackFunctionArn: callbackFunctionArn,
			param_ExternalId: externalId
		});

		return `https://${region}.console.aws.amazon.com/cloudformation/home?region=${region}#/stacks/create/review?${query.toString()}`;
	}
);

export const outputs = {
	connectorEventUrl: connectorEvent.url,
	collectorRoleArn: api.nodes.role.arn,
	registrationRoleArn: connectorEvent.nodes.role.arn,
	externalId,
	connectorTemplateUrl,
	connectorQuickCreateUrl
};
