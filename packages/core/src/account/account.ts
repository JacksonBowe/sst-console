import { z } from "zod";

import { db } from "../db";
import { fn } from "../util/fn";
import { accountErrors } from "./errors";
import { AccountKeySchema, AccountSchema, AccountUpdateSchema } from "./schema";

export type Account = z.infer<typeof AccountSchema>;

/** Creates or replaces one Account while preserving its original creation time. */
export const create = fn(AccountSchema, async input => {
	await db.entities.account
		.upsert({
			accountId: input.accountId,
			region: input.region,
			roleArn: input.roleArn,
			status: input.status,
			...(input.stateBucket === undefined
				? {}
				: { stateBucket: input.stateBucket }),
			...(input.lastSyncedAt === undefined
				? {}
				: { lastSyncedAt: input.lastSyncedAt }),
			...(input.lastSyncConflicts === undefined
				? {}
				: { lastSyncConflicts: input.lastSyncConflicts }),
			updatedAt: input.updatedAt
		})
		.ifNotExists({ createdAt: input.createdAt })
		.go({ response: "none" });
	return get({ accountId: input.accountId });
});

/** Finds one Account or returns null when it does not exist. */
export const find = fn(AccountKeySchema, async input => {
	const result = await db.entities.account
		.get(input)
		.go({ consistent: true });
	return result.data ? AccountSchema.parse(result.data) : null;
});

/** Gets one Account or throws when it does not exist. */
export const get = fn(AccountKeySchema, async input => {
	const account = await find(input);
	if (!account) throw accountErrors.notFound();
	return account;
});

/** Updates mutable Account fields. */
export const update = fn(
	AccountUpdateSchema,
	async ({ accountId, ...changes }) => {
		await db.entities.account
			.patch({ accountId })
			.set(changes)
			.go({ response: "none" });
		return get({ accountId });
	}
);

/** Deletes one Account. */
export const remove = fn(AccountKeySchema, async input => {
	await db.entities.account.delete(input).go({ response: "none" });
});

/** Lists connected and disconnected Console accounts. */
export async function list(): Promise<Account[]> {
	const results = await Promise.all(
		(["connected", "disconnected"] as const).map(status =>
			db.entities.account.query.byStatus({ status }).go({ pages: "all" })
		)
	);

	return results.flatMap(result =>
		result.data.map(account => AccountSchema.parse(account))
	);
}
