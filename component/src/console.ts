import { createConnector } from "./infra/connector";

export type ConsoleArgs = {};

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
		this.externalId = $interpolate`sst-console:${identity.accountId}:${$app.stage}`;
		const connector = createConnector(
			name,
			{ externalId: this.externalId },
			this
		);
		this.connectionProbeFunctionName =
			connector.connectionProbeFunctionName;
		this.connectionProbeRoleArn = connector.connectionProbeRoleArn;
		this.connectorTemplateUrl = connector.connectorTemplateUrl;
		this.connectorQuickCreateUrl = connector.connectorQuickCreateUrl;

		this.registerOutputs({
			connectionProbeFunctionName: this.connectionProbeFunctionName,
			connectionProbeRoleArn: this.connectionProbeRoleArn,
			externalId: this.externalId,
			connectorTemplateUrl: this.connectorTemplateUrl,
			connectorQuickCreateUrl: this.connectorQuickCreateUrl
		});
	}
}
