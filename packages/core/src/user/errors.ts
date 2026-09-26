import { AuthError, ConflictError, InputError, NotFoundError } from "../error";

export const userErrors = {
	notFound: () => new NotFoundError("user.not_found", "User was not found"),
	exists: () => new ConflictError("user.exists", "User already exists"),
	invalidCredentials: () =>
		new AuthError("user.invalid_credentials", "Invalid email or password"),
	invalidPassword: () =>
		new InputError(
			"user.invalid_password",
			"Password does not meet requirements"
		),
	invalidCode: () => new InputError("user.invalid_code", "Invalid code"),
	expiredCode: () =>
		new InputError("user.expired_code", "Invalid or expired code"),
	invalidState: (message: string) =>
		new InputError("user.invalid_state", message),
	attemptLimitExceeded: () =>
		new InputError(
			"user.attempt_limit_exceeded",
			"Attempt limit exceeded; try again later"
		)
};
