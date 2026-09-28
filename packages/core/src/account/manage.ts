import { z } from "zod";

import * as Connection from "../connection";
import { db } from "../db";
import { InputError } from "../error";
import { fn } from "../util/fn";
import { AccountSyncPolicySchema } from "./policy";
import { sync } from "./sync";

const accountId = z.string().regex(/^\d{12}$/);

export const manageApps = fn(z.object({ accountId }), async ({ accountId }) => {
	const account = await db.entities.account
		.get({ accountId })
		.go({ consistent: true });
	if (!account.data)
		throw new InputError(
			"account_not_found",
			"Connected account was not found"
		);
	const [policy, stages] = await Promise.all([
		Connection.getSyncPolicy(accountId),
		db.entities.discoveredStage.query
			.discovery({ accountId })
			.go({ pages: "all" })
	]);
	return {
		policy,
		stages: stages.data.map(stage => ({
			app: stage.appName,
			stage: stage.stageName,
			key: stage.stateKey,
			lastModified: stage.lastModified,
			size: stage.size,
			discoveredAt: stage.discoveredAt
		}))
	};
});

export const updateSyncPolicy = fn(
	z.object({ accountId, policy: AccountSyncPolicySchema }),
	async ({ accountId, policy }) => {
		const saved = await Connection.updateSyncPolicy({
			accountId,
			policy,
			updatedAt: new Date().toISOString()
		});
		if (!saved)
			throw new InputError(
				"account_not_found",
				"Connected account was not found"
			);
		return saved;
	}
);

export const applySyncPolicy = fn(
	z.object({ accountId, policy: AccountSyncPolicySchema }),
	async input => {
		await updateSyncPolicy(input);
		return sync({ accountId: input.accountId });
	}
);
