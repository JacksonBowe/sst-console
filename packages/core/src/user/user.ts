import {
	AdminCreateUserCommand,
	AdminDeleteUserCommand,
	AdminDisableUserCommand,
	AdminEnableUserCommand,
	AdminGetUserCommand,
	CognitoIdentityProviderClient,
	InvalidParameterException,
	InvalidPasswordException,
	LimitExceededException,
	UsernameExistsException,
	UserNotFoundException
} from "@aws-sdk/client-cognito-identity-provider";
import { Resource } from "sst";
import { ulid } from "ulid";
import z from "zod";
import { db } from "../db";
import type { Page } from "../db/types";
import { isULID, UnhandledServerError } from "../error";
import { fn } from "../util/fn";
import { userErrors } from "./errors";
import { CognitoStatus } from "./user.dynamo";
export { CognitoStatus } from "./user.dynamo";

const cognito = new CognitoIdentityProviderClient({});

export const UserInfoSchema = z.object({
	id: isULID(),
	cognitoSub: z.string().min(1),
	email: z.email(),
	cognitoStatus: z.enum(CognitoStatus),
	cognitoEnabled: z.boolean(),
	createdAt: z.string(),
	updatedAt: z.string()
});

export type UserInfo = z.infer<typeof UserInfoSchema>;

export const UserIdentitySchema = z.object({
	cognitoSub: z.string().min(1),
	userId: isULID(),
	createdAt: z.string(),
	schemaVersion: z.string()
});

/** Resolves a Cognito subject to its Console identity. */
export const getIdentity = fn(
	z.object({ cognitoSub: z.string().min(1) }),
	async ({ cognitoSub }) => {
		const result = await db.entities.userIdentity
			.get({ cognitoSub })
			.go({ consistent: true });
		return result.data ? UserIdentitySchema.parse(result.data) : null;
	}
);

/** Creates a Cognito-linked user and its identity mapping. */
export const create = fn(
	z.object({
		cognitoSub: z.string().min(1),
		email: z.email(),
		cognitoStatus: z.enum(CognitoStatus),
		cognitoEnabled: z.boolean()
	}),
	async input => {
		const now = new Date().toISOString();
		const id = ulid();
		const transaction = await db.transaction
			.write(({ user, userIdentity }) => [
				user
					.create({ ...input, id, createdAt: now, updatedAt: now })
					.commit(),
				userIdentity
					.create({
						cognitoSub: input.cognitoSub,
						userId: id,
						createdAt: now
					})
					.commit()
			])
			.go();
		if (!transaction.canceled) return { id };
		throw userErrors.exists();
	}
);

/** Invites a user through Cognito; its custom-message trigger provisions Console data. */
export const invite = fn(z.object({ email: z.email() }), async ({ email }) => {
	try {
		const response = await cognito.send(
			new AdminCreateUserCommand({
				UserPoolId: Resource.SSTConsoleCognitoUserPool.id,
				Username: email,
				UserAttributes: [
					{ Name: "email", Value: email },
					{ Name: "email_verified", Value: "true" }
				],
				DesiredDeliveryMediums: ["EMAIL"]
			})
		);
		const cognitoSub = response.User?.Attributes?.find(
			attribute => attribute.Name === "sub"
		)?.Value;
		if (!cognitoSub)
			throw new UnhandledServerError("Cognito user is missing a subject");
		const id = (await getIdentity({ cognitoSub }))?.userId;
		if (!id)
			throw new UnhandledServerError("Cognito user was not provisioned");
		return { id };
	} catch (error) {
		if (error instanceof UsernameExistsException) {
			return resendExistingInvite(email);
		}
		if (error instanceof InvalidPasswordException)
			throw userErrors.invalidPassword();
		if (error instanceof InvalidParameterException)
			throw userErrors.invalidState(error.message);
		if (error instanceof LimitExceededException)
			throw userErrors.attemptLimitExceeded();
		if (error instanceof UnhandledServerError) throw error;
		throw new UnhandledServerError("Failed to invite user", error);
	}
});

/** Resends only for an existing Console user awaiting first sign-in. */
async function resendExistingInvite(email: string) {
	const existing = await cognito.send(
		new AdminGetUserCommand({
			UserPoolId: Resource.SSTConsoleCognitoUserPool.id,
			Username: email
		})
	);
	if (existing.UserStatus !== "FORCE_CHANGE_PASSWORD")
		throw userErrors.exists();
	const sub = existing.UserAttributes?.find(
		attribute => attribute.Name === "sub"
	)?.Value;
	const id = sub ? (await getIdentity({ cognitoSub: sub }))?.userId : null;
	if (!id) throw userErrors.exists();
	const user = await get({ id });
	try {
		await cognito.send(
			new AdminCreateUserCommand({
				UserPoolId: Resource.SSTConsoleCognitoUserPool.id,
				Username: user.email,
				MessageAction: "RESEND",
				DesiredDeliveryMediums: ["EMAIL"]
			})
		);
	} catch (error) {
		throw new UnhandledServerError("Failed to resend invitation", error);
	}
	return { id };
}

/** Changes both Cognito access and the Console user's enabled state. */
export const setEnabled = fn(
	z.object({ id: isULID(), enabled: z.boolean() }),
	async ({ id, enabled }) => {
		const user = await get({ id });
		const input = {
			UserPoolId: Resource.SSTConsoleCognitoUserPool.id,
			Username: user.email
		};
		try {
			await cognito.send(
				enabled
					? new AdminEnableUserCommand(input)
					: new AdminDisableUserCommand(input)
			);
		} catch (error) {
			throw new UnhandledServerError(
				"Failed to change user access",
				error
			);
		}
		await db.entities.user
			.patch({ id: user.id })
			.set({
				cognitoEnabled: enabled,
				updatedAt: new Date().toISOString()
			})
			.go({ response: "none" });
	}
);

/** Updates one or more user fields. */
export const update = fn(
	z
		.object({ id: isULID() })
		.extend({
			email: z.email().optional(),
			cognitoStatus: z.enum(CognitoStatus).optional()
		})
		.refine(
			input =>
				input.email !== undefined || input.cognitoStatus !== undefined,
			"At least one user field must be updated"
		),
	async ({ id, ...changes }) => {
		await db.entities.user
			.patch({ id })
			.set({ ...changes, updatedAt: new Date().toISOString() })
			.go({ response: "none" });
	}
);

/** Gets user by native Console user ID. */
export const get = fn(z.object({ id: isULID() }), async input => {
	const result = await db.entities.user.get(input).go({ consistent: true });
	if (!result.data) throw userErrors.notFound();
	return UserInfoSchema.parse(result.data);
});

/** Lists users by descending ID with optional attribute filters. */
export const list = fn(
	z.object({
		limit: z.number().int().min(1).max(100).default(50),
		cursor: z.string().min(1).optional(),
		email: z.email().optional(),
		cognitoStatus: z.enum(CognitoStatus).optional(),
		cognitoEnabled: z.boolean().optional()
	}),
	async ({
		limit,
		cursor,
		email,
		cognitoStatus,
		cognitoEnabled
	}): Promise<Page<UserInfo>> => {
		const query =
			email || cognitoStatus || cognitoEnabled !== undefined
				? db.entities.user.query
						.byType({})
						.where((attribute, operation) => {
							const filters = [
								email && operation.eq(attribute.email, email),
								cognitoStatus &&
									operation.eq(
										attribute.cognitoStatus,
										cognitoStatus
									),
								cognitoEnabled !== undefined &&
									operation.eq(
										attribute.cognitoEnabled,
										cognitoEnabled
									)
							].filter((filter): filter is string =>
								Boolean(filter)
							);
							return filters.join(" AND ");
						})
				: db.entities.user.query.byType({});
		const result = await query.go({ limit, cursor, order: "desc" });
		return {
			items: result.data.map(user => UserInfoSchema.parse(user)),
			meta: {
				limit,
				hasMore: result.cursor !== null,
				nextCursor: result.cursor
			}
		};
	}
);

/** Deletes Cognito account and associated Console user records. */
export const remove = fn(z.object({ id: isULID() }), async ({ id }) => {
	const user = await get({ id });
	try {
		await cognito.send(
			new AdminDeleteUserCommand({
				UserPoolId: Resource.SSTConsoleCognitoUserPool.id,
				Username: user.email
			})
		);
	} catch (error) {
		if (!(error instanceof UserNotFoundException))
			throw new UnhandledServerError(
				"Failed to delete Cognito user",
				error
			);
	}
	await db.transaction
		.write(({ user: userEntity, userIdentity }) => [
			userEntity.delete({ id }).commit(),
			userIdentity.delete({ cognitoSub: user.cognitoSub }).commit()
		])
		.go();
});
