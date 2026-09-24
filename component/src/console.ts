import { createRequire } from "node:module";
import { dirname, join } from "node:path";

export type ConsoleArgs = {};

const require = createRequire(import.meta.url);
const componentPath = dirname(require.resolve("sst-console/package.json"));
const connectionProbeBundle = join(
	componentPath,
	"dist",
	"functions",
	"connector"
);

export class Console extends $util.ComponentResource {
	readonly __name: string;
	readonly connectionProbeFunctionName: $util.Output<string>;
	readonly connectionProbeRoleArn: $util.Output<string>;
	readonly externalId: $util.Output<string>;
	readonly connectorTemplateUrl: $util.Output<string>;
	readonly connectorQuickCreateUrl: $util.Output<string>;

	constructor(
		name: string,
		_args: ConsoleArgs = {},
		opts?: $util.ComponentResourceOptions
	) {
		super("sst-console:index:Console", name, {}, opts);
		this.__name = name;

		const identity = aws.getCallerIdentityOutput();
		const region = aws.getRegionOutput().name;
		this.externalId = $interpolate`sst-console:${identity.accountId}:${$app.stage}`;

		const connectorTemplates = new sst.aws.Bucket(
			`${name}ConnectorTemplates`,
			{
				access: "public"
			},
			{ parent: this }
		);

		const connectionProbe = new sst.aws.Function(
			`${name}ConnectionProbe`,
			{
				bundle: connectionProbeBundle,
				handler: "index.handler",
				dev: false,
				environment: {
					SST_CONSOLE_EXTERNAL_ID: this.externalId
				},
				permissions: [
					{
						actions: ["sts:AssumeRole"],
						resources: ["arn:aws:iam::*:role/SSTConsoleRole"]
					}
				]
			},
			{ parent: this }
		);

		new aws.s3.BucketObjectv2(
			`${name}ConnectorTemplate`,
			{
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
								"Role assumed by SST Console to read this account.",
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
			},
			{ parent: this }
		);

		this.connectorTemplateUrl = $interpolate`https://${connectorTemplates.nodes.bucket.bucketRegionalDomainName}/connect/template.json`;
		this.connectionProbeFunctionName = connectionProbe.name;
		this.connectionProbeRoleArn = connectionProbe.nodes.role.arn;
		this.connectorQuickCreateUrl = $resolve({
			region,
			templateUrl: this.connectorTemplateUrl,
			collectorRoleArn: this.connectionProbeRoleArn,
			externalId: this.externalId
		}).apply(({ region, templateUrl, collectorRoleArn, externalId }) => {
			const query = new URLSearchParams({
				templateURL: templateUrl,
				stackName: "SSTConsoleConnection",
				param_CollectorRoleArn: collectorRoleArn,
				param_ExternalId: externalId
			});

			return `https://${region}.console.aws.amazon.com/cloudformation/home?region=${region}#/stacks/create/review?${query}`;
		});

		this.registerOutputs({
			connectionProbeFunctionName: this.connectionProbeFunctionName,
			connectionProbeRoleArn: this.connectionProbeRoleArn,
			externalId: this.externalId,
			connectorTemplateUrl: this.connectorTemplateUrl,
			connectorQuickCreateUrl: this.connectorQuickCreateUrl
		});
	}
}
