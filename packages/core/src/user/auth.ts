import {
	AdminGetUserCommand,
	AdminRespondToAuthChallengeCommand,
	CodeMismatchException,
	CognitoIdentityProviderClient,
	ConfirmForgotPasswordCommand,
	ExpiredCodeException,
	ForgotPasswordCommand,
	InitiateAuthCommand,
	InvalidParameterException,
	InvalidPasswordException,
	LimitExceededException,
	NotAuthorizedException,
	UserNotConfirmedException,
	UserNotFoundException
} from "@aws-sdk/client-cognito-identity-provider";
import { Resource } from "sst";
import z from "zod";

import { UnhandledServerError } from "../error";
import { fn } from "../util/fn";
import { userErrors } from "./errors";
import * as User from "./user";

const cognito = new CognitoIdentityProviderClient({});

/** Extracts Cognito's stable subject from user attributes. */
function cognitoSub(
	attributes: Array<{ Name?: string; Value?: string }> | undefined
) {
	const sub = attributes?.find(attribute => attribute.Name === "sub")?.Value;
	if (!sub)
		throw new UnhandledServerError("Cognito user is missing a subject");
	return sub;
}

/** Ensures authenticated Cognito identity has enabled Console user record. */
async function requireConsoleUser(email: string) {
	const cognitoUser = await getCognitoByEmail({ email });
	const id = await User.exchangeCognitoSub({
		cognitoSub: cognitoSub(cognitoUser.UserAttributes)
	});
	if (!id) throw userErrors.notFound();
	const user = await User.get({ id });
	if (!user) throw userErrors.notFound();
	if (!user.cognitoEnabled) {
		throw userErrors.invalidState("User is disabled");
	}
	return user;
}

/** Authenticates credentials and returns tokens or initial-password challenge. */
export const auth = fn(
	z.object({
		email: z.email(),
		password: z.string()
	}),
	async input => {
		let response;
		try {
			response = await cognito.send(
				new InitiateAuthCommand({
					ClientId: Resource.SSTConsoleCognitoUserPoolClient.id,
					AuthFlow: "USER_PASSWORD_AUTH",
					AuthParameters: {
						USERNAME: input.email,
						PASSWORD: input.password
					}
				})
			);
		} catch (error) {
			if (error instanceof NotAuthorizedException)
				throw userErrors.invalidCredentials();
			if (error instanceof InvalidParameterException) {
				throw userErrors.invalidState(error.message);
			}
			if (error instanceof UserNotConfirmedException) {
				throw userErrors.invalidState("User is not confirmed");
			}
			throw new UnhandledServerError(
				"Failed to authenticate user",
				error
			);
		}

		if (response.ChallengeName) {
			if (response.ChallengeName !== "NEW_PASSWORD_REQUIRED") {
				throw new UnhandledServerError(
					`Unhandled Cognito challenge: ${response.ChallengeName}`
				);
			}
			await requireConsoleUser(input.email);
			return {
				challengeName: response.ChallengeName,
				session: response.Session
			};
		}

		const tokens = response.AuthenticationResult;
		if (!tokens)
			throw new UnhandledServerError("Cognito returned no tokens");
		await requireConsoleUser(input.email);
		return {
			accessToken: tokens.AccessToken,
			refreshToken: tokens.RefreshToken,
			idToken: tokens.IdToken,
			expiresIn: tokens.ExpiresIn,
			tokenType: tokens.TokenType
		};
	}
);

/** Completes invite password challenge and activates Console user. */
export const inviteConfirm = fn(
	z.object({
		email: z.email(),
		session: z.string(),
		newPassword: z.string().min(8)
	}),
	async input => {
		let response;
		try {
			response = await cognito.send(
				new AdminRespondToAuthChallengeCommand({
					UserPoolId: Resource.SSTConsoleCognitoUserPool.id,
					ClientId: Resource.SSTConsoleCognitoUserPoolClient.id,
					ChallengeName: "NEW_PASSWORD_REQUIRED",
					ChallengeResponses: {
						USERNAME: input.email,
						NEW_PASSWORD: input.newPassword
					},
					Session: input.session
				})
			);
		} catch (error) {
			if (error instanceof InvalidPasswordException)
				throw userErrors.invalidPassword();
			if (error instanceof NotAuthorizedException)
				throw userErrors.invalidCredentials();
			if (error instanceof InvalidParameterException) {
				throw userErrors.invalidState(error.message);
			}
			throw new UnhandledServerError(
				"Failed to confirm invitation",
				error
			);
		}

		const user = await requireConsoleUser(input.email);
		await User.update({
			id: user.id,
			cognitoStatus: "CONFIRMED"
		});

		const tokens = response.AuthenticationResult;
		if (!tokens)
			throw new UnhandledServerError("Cognito returned no tokens");
		return {
			accessToken: tokens.AccessToken,
			refreshToken: tokens.RefreshToken,
			idToken: tokens.IdToken,
			expiresIn: tokens.ExpiresIn,
			tokenType: tokens.TokenType
		};
	}
);

/** Exchanges refresh token for a new Cognito session. */
export const refresh = fn(
	z.object({ refreshToken: z.string() }),
	async input => {
		try {
			const response = await cognito.send(
				new InitiateAuthCommand({
					ClientId: Resource.SSTConsoleCognitoUserPoolClient.id,
					AuthFlow: "REFRESH_TOKEN_AUTH",
					AuthParameters: { REFRESH_TOKEN: input.refreshToken }
				})
			);
			const tokens = response.AuthenticationResult;
			if (!tokens)
				throw new UnhandledServerError("Cognito returned no tokens");
			return {
				accessToken: tokens.AccessToken,
				idToken: tokens.IdToken,
				expiresIn: tokens.ExpiresIn,
				tokenType: tokens.TokenType
			};
		} catch (error) {
			if (error instanceof NotAuthorizedException)
				throw userErrors.invalidCredentials();
			throw new UnhandledServerError("Failed to refresh session", error);
		}
	}
);

/** Sends Cognito password-recovery message. */
export const recover = fn(z.object({ email: z.email() }), async ({ email }) => {
	try {
		await cognito.send(
			new ForgotPasswordCommand({
				ClientId: Resource.SSTConsoleCognitoUserPoolClient.id,
				Username: email
			})
		);
	} catch (error) {
		if (error instanceof UserNotFoundException) throw userErrors.notFound();
		if (error instanceof LimitExceededException)
			throw userErrors.attemptLimitExceeded();
		throw new UnhandledServerError(
			"Failed to start password recovery",
			error
		);
	}
});

/** Sets new password from Cognito recovery code. */
export const recoverConfirm = fn(
	z.object({
		email: z.email(),
		code: z.string(),
		newPassword: z.string().min(8)
	}),
	async ({ email, code, newPassword }) => {
		try {
			await cognito.send(
				new ConfirmForgotPasswordCommand({
					ClientId: Resource.SSTConsoleCognitoUserPoolClient.id,
					Username: email,
					ConfirmationCode: code,
					Password: newPassword
				})
			);
		} catch (error) {
			if (error instanceof ExpiredCodeException)
				throw userErrors.expiredCode();
			if (error instanceof CodeMismatchException)
				throw userErrors.invalidCode();
			if (error instanceof UserNotFoundException)
				throw userErrors.notFound();
			if (error instanceof InvalidPasswordException)
				throw userErrors.invalidPassword();
			throw new UnhandledServerError(
				"Failed to confirm password recovery",
				error
			);
		}
	}
);

/** Retrieves Cognito user required to resolve Console user ID. */
export const getCognitoByEmail = fn(
	z.object({ email: z.email() }),
	async ({ email }) => {
		try {
			return await cognito.send(
				new AdminGetUserCommand({
					UserPoolId: Resource.SSTConsoleCognitoUserPool.id,
					Username: email
				})
			);
		} catch (error) {
			if (error instanceof UserNotFoundException)
				throw userErrors.notFound();
			throw new UnhandledServerError("Failed to get Cognito user", error);
		}
	}
);
