import {
	CloudFormationClient,
	DescribeStacksCommand,
	UpdateStackCommand
} from "@aws-sdk/client-cloudformation";
import * as Account from "@console/core/account";

type ReconcileEvent = {
	fingerprint: string;
	templateUrl: string;
};

/** Requests updates without waiting for CloudFormation to finish them. */
export async function handler({ fingerprint, templateUrl }: ReconcileEvent) {
	const stackName = process.env.SST_CONSOLE_CONNECTOR_STACK_NAME;
	if (!stackName || !fingerprint || !templateUrl) {
		throw new Error("Connector reconciliation configuration is missing");
	}

	const accounts = (await Account.list()).filter(
		account => account.status === "connected"
	);
	const failures: string[] = [];

	// Limit concurrent cross-account requests without waiting for stack completion.
	for (let index = 0; index < accounts.length; index += 5) {
		await Promise.all(
			accounts.slice(index, index + 5).map(async account => {
				try {
					const { connection } = await Account.Connector.connect(
						account.accountId
					);
					const client = new CloudFormationClient({
						region: connection.region,
						credentials: connection.credentials
					});
					const result = await client.send(
						new DescribeStacksCommand({ StackName: stackName })
					);
					const stack = result.Stacks?.[0];
					if (!stack?.Parameters) {
						throw new Error(
							"Connector stack or parameters not found"
						);
					}
					if (
						stack.Outputs?.some(
							output =>
								output.OutputKey ===
									"ConnectorTemplateFingerprint" &&
								output.OutputValue === fingerprint
						)
					) {
						console.info(
							"Connector already up to date",
							account.accountId
						);
						return;
					}
					await client.send(
						new UpdateStackCommand({
							StackName: stackName,
							TemplateURL: templateUrl,
							Capabilities: ["CAPABILITY_NAMED_IAM"],
							// Connector template parameters must remain stable:
							// removed parameters fail updates; new required ones need values.
							Parameters: stack.Parameters.map(
								({ ParameterKey }) => ({
									ParameterKey,
									UsePreviousValue: true
								})
							)
						})
					);
					console.info(
						"Connector update requested",
						account.accountId
					);
				} catch (error) {
					failures.push(account.accountId);
					console.error("Connector update request failed", {
						accountId: account.accountId,
						error
					});
				}
			})
		);
	}

	if (failures.length) {
		throw new Error(
			`Connector update requests failed for accounts: ${failures.join(", ")}`
		);
	}
	return { checked: accounts.length };
}
