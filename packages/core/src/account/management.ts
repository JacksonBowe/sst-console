import * as Connection from "../connection";
import { db } from "../db";
import { fn } from "../util/fn";
import * as Account from "./account";
import { accountErrors } from "./errors";
import { AccountKeySchema } from "./schema";
import { sync } from "./sync";

export const manageApps = fn(AccountKeySchema, async ({ accountId }) => {
	await Account.get({ accountId });
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
	AccountKeySchema.extend({ policy: Connection.AccountSyncPolicySchema }),
	async ({ accountId, policy }) => {
		const saved = await Connection.updateSyncPolicy({
			accountId,
			policy,
			updatedAt: new Date().toISOString()
		});
		if (!saved) throw accountErrors.notFound();
		return saved;
	}
);

export const applySyncPolicy = fn(
	AccountKeySchema.extend({ policy: Connection.AccountSyncPolicySchema }),
	async input => {
		await updateSyncPolicy(input);
		return sync({ accountId: input.accountId });
	}
);
