import { describe, expect, it, vi } from "vitest";

vi.mock("sst", () => ({
	Resource: {
		ConsoleData: { name: "ConsoleData-test" }
	}
}));

const { db } = await import("./service");

describe("db service", () => {
	it("builds account and status lookup keys", () => {
		const accountId = "123456789012";
		const get = db.entities.account.get({ accountId }).params();
		const list = db.entities.account.query
			.byStatus({ status: "connected" })
			.params();

		expect(get).toMatchObject({
			TableName: "ConsoleData-test",
			Key: { pk: `ACCOUNT#${accountId}`, sk: "account" }
		});
		expect(list).toMatchObject({
			TableName: "ConsoleData-test",
			IndexName: "accountsByStatus"
		});
	});

	it("builds hierarchy and resource ARN lookup keys", () => {
		const resource = db.entities.resource
			.get({
				accountId: "123456789012",
				appName: "console",
				stageName: "prod",
				resourceId: "bucket"
			})
			.params();
		const byArn = db.entities.resource.query
			.byArn({ normalizedArn: "arn:aws:s3:::console-bucket" })
			.params();

		expect(resource.Key).toEqual({
			pk: "ACCOUNT#123456789012",
			sk: "APP#console#STAGE#prod#RESOURCE#bucket"
		});
		expect(byArn.IndexName).toBe("resourcesByArn");
	});

	it("builds state snapshot keys", () => {
		const snapshot = db.entities.stateSnapshot
			.get({
				accountId: "123456789012",
				appName: "console",
				stageName: "prod",
				reverseTimestamp: "9999999999999",
				snapshotId: "state-version"
			})
			.params();

		expect(snapshot.Key).toEqual({
			pk: "ACCOUNT#123456789012#APP#console#STAGE#prod",
			sk: "SNAPSHOT#9999999999999#state-version"
		});
	});

	it("builds atomic account sync persistence", () => {
		const accountId = "123456789012";
		const now = "2026-09-25T00:00:00.000Z";
		const transaction = db.transaction
			.write(({ account, syncRun }) => [
				account
					.patch({ accountId })
					.set({
						status: "connected",
						stateBucket: "sst-state",
						lastSyncedAt: now,
						updatedAt: now
					})
					.commit(),
				syncRun
					.create({
						accountId,
						syncRunId: "sync-1",
						reverseTimestamp: "9999999999999",
						status: "succeeded",
						startedAt: now
					})
					.commit()
			])
			.params();

		expect(transaction.TransactItems).toHaveLength(2);
	});
});
