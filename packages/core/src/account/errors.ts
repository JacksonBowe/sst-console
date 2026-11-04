import { InputError, NotFoundError, ServerError } from "../error";

export const accountErrors = {
	notFound: () =>
		new NotFoundError(
			"account.not_found",
			"Connected account was not found"
		),
	verificationFailed: () =>
		new ServerError(
			"account.verification_failed",
			"Connector role does not belong to registered account"
		),
	invalidRoleArn: () =>
		new InputError(
			"account.invalid_role_arn",
			"Connector role ARN does not belong to supplied account"
		),
	invalidForwardingRoleArn: () =>
		new ServerError(
			"account.invalid_forwarding_role_arn",
			"Invalid connector role ARN"
		),
	missingExternalId: () =>
		new ServerError(
			"account.missing_external_id",
			"SST Console external ID is not configured"
		),
	missingCredentials: () =>
		new ServerError(
			"account.missing_assumed_credentials",
			"AWS did not return target account credentials"
		),
	invalidCredentials: () =>
		new ServerError(
			"account.invalid_assumed_credentials",
			"AWS returned incomplete target account credentials"
		),
	invalidTargetIdentity: () =>
		new ServerError(
			"account.invalid_target_identity",
			"AWS did not return target account identity"
		),
	missingPublisherRole: () =>
		new ServerError(
			"account.missing_event_publisher_role",
			"Connection stack publisher role not found"
		),
	forwardingTargetFailed: () =>
		new ServerError(
			"account.event_forwarding_target_failed",
			"Unable to configure state event forwarding target"
		),
	missingBusArn: () =>
		new ServerError(
			"account.missing_bus_arn",
			"Console event bus ARN is not configured"
		)
};

/** AWS authorization errors indicate the Workload connection may no longer be usable. */
export function isRemoteAccessFailure(error: unknown): boolean {
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
