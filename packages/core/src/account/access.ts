import * as Account from "./account";
import * as Connector from "./connector";
import { accountErrors } from "./errors";

export async function connect(accountId: string) {
	const account = await Account.find({ accountId });
	if (!account || account.status !== "connected")
		throw accountErrors.notFound();
	const connection = await withDisconnectOnAccessFailure(accountId, () =>
		Connector.assume({ roleArn: account.roleArn, region: account.region })
	);
	if (connection.accountId !== accountId)
		throw accountErrors.verificationFailed();
	return { account, connection };
}

export async function withDisconnectOnAccessFailure<T>(
	accountId: string,
	operation: () => Promise<T>
): Promise<T> {
	try {
		return await operation();
	} catch (error) {
		if (isRemoteAccessFailure(error)) {
			try {
				await Account.update({
					accountId,
					status: "disconnected",
					updatedAt: new Date().toISOString()
				});
			} catch (persistenceError) {
				console.error(
					"Unable to mark account disconnected after access failure",
					{ accountId },
					persistenceError
				);
			}
		}
		throw error;
	}
}

function isRemoteAccessFailure(error: unknown): boolean {
	if (typeof error !== "object" || error === null) return false;
	const awsError = error as {
		name?: unknown;
		$metadata?: { httpStatusCode?: unknown };
	};
	const code = typeof awsError.name === "string" ? awsError.name : "";
	return (
		[
			"AccessDenied",
			"AccessDeniedException",
			"UnauthorizedOperation",
			"NoSuchEntity",
			"NoSuchEntityException",
			"InvalidClientTokenId",
			"UnrecognizedClientException"
		].includes(code) || awsError.$metadata?.httpStatusCode === 403
	);
}
