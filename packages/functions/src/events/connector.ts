import * as Account from "@console/core/account";
import { PublicError } from "@console/core/error";
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

		const account = await Account.Connector.register(
			input as Account.Connector.RegisterInput
		);

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

function response(statusCode: number, body: Record<string, string>) {
	return {
		statusCode,
		headers: {
			"content-type": "application/json"
		},
		body: JSON.stringify(body)
	};
}
