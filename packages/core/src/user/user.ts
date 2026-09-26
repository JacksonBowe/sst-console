import {
	AdminCreateUserCommand,
	AdminDeleteUserCommand,
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

const cognito = new CognitoIdentityProviderClient({});

export const UserInfoSchema = z.object({
	id: isULID(),
	email: z.email(),
	cognitoStatus: z.enum(CognitoStatus),
	cognitoEnabled: z.boolean(),
	createdAt: z.string(),
	updatedAt: z.string()
});

export type UserInfo = z.infer<typeof UserInfoSchema>;

async function getRecord({ id }: { id: string }) {
	const result = await db.entities.user.get({ id }).go({ consistent: true });
	return result.data ?? null;
}

/** Resolves a Cognito subject to its native Console user ID. */
export const exchangeCognitoSub = fn(
	z.object({ cognitoSub: z.string().min(1) }),
	async ({ cognitoSub }) => {
		const result = await db.entities.userIdentity
			.get({ cognitoSub })
			.go({ consistent: true });
		return result.data?.userId ?? null;
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
		const id = await exchangeCognitoSub({ cognitoSub });
		if (!id)
			throw new UnhandledServerError("Cognito user was not provisioned");
		return { id };
	} catch (error) {
		if (error instanceof UsernameExistsException) throw userErrors.exists();
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

/** Updates one or more user fields. */
export const update = fn(
	z
		.object({ id: isULID() })
		.extend({
			email: z.email().optional(),
			cognitoStatus: z.enum(CognitoStatus).optional(),
			cognitoEnabled: z.boolean().optional()
		})
		.refine(
			input =>
				input.email !== undefined ||
				input.cognitoStatus !== undefined ||
				input.cognitoEnabled !== undefined,
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
	const user = await getRecord(input);
	return user ? UserInfoSchema.parse(user) : null;
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
	async ({ limit, cursor, email, cognitoStatus, cognitoEnabled }): Promise<Page<UserInfo>> => {
		let query = db.entities.user.query
			.byId({})
			.where((attribute, operation) => operation.exists(attribute.id));
		if (email)
			query = query.where((attribute, operation) =>
				operation.eq(attribute.email, email)
			);
		if (cognitoStatus)
			query = query.where((attribute, operation) =>
				operation.eq(attribute.cognitoStatus, cognitoStatus)
			);
		if (cognitoEnabled !== undefined)
			query = query.where((attribute, operation) =>
				operation.eq(attribute.cognitoEnabled, cognitoEnabled)
			);
		const result = await query.go({ limit, cursor, order: "desc" });
		return {
			items: result.data.map(user => UserInfoSchema.parse(user)),
			meta: {
				limit,
				hasMore: result.cursor !== null,
				nextCursor: result.cursor
			}
		}
	}
);

/** Deletes Cognito account and associated Console user records. */
export const remove = fn(z.object({ id: isULID() }), async ({ id }) => {
	const user = await getRecord({ id });
	if (!user) throw userErrors.notFound();
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
