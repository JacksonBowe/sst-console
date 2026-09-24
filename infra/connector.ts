const identity = aws.getCallerIdentityOutput();
const externalId = $interpolate`sst-console:${identity.accountId}:${$app.stage}`;
const region = aws.getRegionOutput().name;
const connectorTemplates = new sst.aws.Bucket("ConnectorTemplates", {
	access: "public"
});

const connectionProbe = new sst.aws.Function("ConnectionProbe", {
	handler: "packages/functions/src/connector/probe.handler",
	dev: false,
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
					"The SST Console ConnectionProbe role ARN from the control account."
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
									AWS: {
										Ref: "CollectorRoleArn"
									}
								},
								Action: "sts:AssumeRole",
								Condition: {
									StringEquals: {
										"sts:ExternalId": {
											Ref: "ExternalId"
										}
									}
								}
							}
						]
					},
					ManagedPolicyArns: [
						"arn:aws:iam::aws:policy/AdministratorAccess"
					]
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
	collectorRoleArn: connectionProbe.nodes.role.arn,
	externalId
}).apply(({ region, templateUrl, collectorRoleArn, externalId }) => {
	const query = new URLSearchParams({
		templateURL: templateUrl,
		stackName: "SSTConsoleConnection",
		param_CollectorRoleArn: collectorRoleArn,
		param_ExternalId: externalId
	});

	return `https://${region}.console.aws.amazon.com/cloudformation/home?region=${region}#/stacks/create/review?${query.toString()}`;
});

export const outputs = {
	connectionProbeFunctionName: connectionProbe.name,
	connectionProbeRoleArn: connectionProbe.nodes.role.arn,
	externalId,
	connectorTemplateUrl,
	connectorQuickCreateUrl
};
