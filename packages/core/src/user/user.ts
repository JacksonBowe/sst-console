import z from "zod";
import { ulid } from "ulid";
import { isULID } from "../error";
import { fn } from "../util/fn";
import { db } from "../db";
import { userErrors } from "./errors";
import { CognitoStatus } from "./user.dynamo";

const UserSchema = z.object({
	cognitoSub: z.string().min(1),
	email: z.email(),
	cognitoStatus: z.enum(CognitoStatus),
	cognitoEnabled: z.boolean()
});

const UserUpdateSchema = z
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
	);

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
export const create = fn(UserSchema, async input => {
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
});

/** Updates one or more user fields. */
export const update = fn(UserUpdateSchema, async ({ id, ...changes }) => {
	await db.entities.user
		.patch({ id })
		.set({ ...changes, updatedAt: new Date().toISOString() })
		.go({ response: "none" });
});

/** Gets user by native Console user ID. */
export const get = fn(z.object({ id: isULID() }), async input => {
	const result = await db.entities.user.get(input).go({ consistent: true });
	return result.data ?? null;
});
