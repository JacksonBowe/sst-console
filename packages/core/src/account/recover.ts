import { z } from "zod";

import * as Connection from "../connection";
import { db } from "../db";
import { fn } from "../util/fn";

export const backupConnections = fn(z.object({}), async () => {
	const accounts = await Promise.all(
		(["connected", "disconnected"] as const).map(status =>
			db.entities.account.query.byStatus({ status }).go({ pages: "all" })
		)
	);
	const records = accounts.flatMap(result => result.data);
	await Promise.all(
		records.map(account => {
			const now = new Date().toISOString();
			return Connection.upsert({
				accountId: account.accountId,
				region: account.region,
				roleArn: account.roleArn,
				createdAt: account.createdAt ?? now,
				updatedAt: account.updatedAt
			});
		})
	);
	return { backedUp: records.length };
});

export const recover = fn(z.object({}), async () => {
	const connections = await Connection.list();
	// TODO: Bound recovery work when connection count grows beyond development use.
	const results = await Promise.all(
		connections.map(async connection => {
			try {
				const now = new Date().toISOString();
				await db.entities.account
					.upsert({
						accountId: connection.accountId,
						region: connection.region,
						roleArn: connection.roleArn,
						status: "connected",
						updatedAt: now
					})
					.ifNotExists({ createdAt: now })
					.go({ response: "none" });

				return {
					accountId: connection.accountId,
					status: "recovered" as const
				};
			} catch (error) {
				return {
					accountId: connection.accountId,
					status: "failed" as const,
					error:
						error instanceof Error ? error.message : String(error)
				};
			}
		})
	);

	return { recovered: results.length, results };
});
