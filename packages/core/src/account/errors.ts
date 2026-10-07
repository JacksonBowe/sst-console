import { InputError, ServerError } from "../error";

export const accountErrors = {
	notFound: () =>
		new InputError("account_not_found", "Connected account was not found"),
	verificationFailed: () =>
		new ServerError(
			"account_verification_failed",
			"Connector role does not belong to registered account"
		)
};
