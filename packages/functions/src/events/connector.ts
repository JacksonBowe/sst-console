import * as Account from "@console/core/account";
import { withActor } from "@console/core/actor";
import { PublicError } from "@console/core/error";
import {
	EventBridgeClient,
	PutPermissionCommand,
	RemovePermissionCommand
} from "@aws-sdk/client-eventbridge";
import { Resource } from "sst";
import type {
	Handler,
	LambdaFunctionURLEventWithIAMAuthorizer,
	LambdaFunctionURLResult
} from "aws-lambda";

export const handler: Handler<
	LambdaFunctionURLEventWithIAMAuthorizer,
	LambdaFunctionURLResult
> = async event => {
	try {
		if (event.requestContext?.http?.method !== "POST") {
			return response(405, { error: "method_not_allowed" });
		}

		const input = event.body
			? (JSON.parse(event.body) as unknown)
			: undefined;
		if (
			typeof input !== "object" ||
			input === null ||
			!("accountId" in input) ||
			input.accountId !== event.requestContext.authorizer.iam.accountId
		) {
			return response(403, { code: "caller_account_mismatch" });
		}

		const connectorInput = input as Account.Connector.RegisterInput;
		if (connectorInput.requestType === "Delete")
			await updateEventBusPermission(connectorInput);
		const account = await withActor(
			{ type: "system", properties: {} },
			() => Account.Connector.register(connectorInput)
		);
		if (connectorInput.requestType !== "Delete")
			await updateEventBusPermission(connectorInput);

		return response(200, account);
	} catch (error) {
		if (error instanceof PublicError) {
			return response(error.status, {
				code: error.code,
				message: error.message
			});
		}

		console.error("Failed to process connector callback", error);
		return response(500, {
			code: "connector_registration_failed",
			message: "Unable to register connector"
		});
	}
};

async function updateEventBusPermission(
	input: Account.Connector.RegisterInput
): Promise<void> {
	const client = new EventBridgeClient({});
	const statementId = `SSTConsoleAccount${input.accountId}`;
	if (input.requestType === "Delete") {
		try {
			await client.send(
				new RemovePermissionCommand({
					EventBusName: Resource.Bus.name,
					StatementId: statementId
				})
			);
		} catch (error) {
			if (!isResourceNotFound(error)) throw error;
		}
		return;
	}
	await client.send(
		new PutPermissionCommand({
			EventBusName: Resource.Bus.name,
			Action: "events:PutEvents",
			Principal: input.accountId,
			StatementId: statementId
		})
	);
}

function isResourceNotFound(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"name" in error &&
		error.name === "ResourceNotFoundException"
	);
}

function response(statusCode: number, body: Record<string, string>) {
	return {
		statusCode,
		headers: {
			"content-type": "application/json"
		},
		body: JSON.stringify(body)
	};
}
