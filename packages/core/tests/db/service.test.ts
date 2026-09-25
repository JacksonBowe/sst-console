import { describe, expect, it, vi } from "vitest";

vi.mock("sst", () => ({
	Resource: {
		ConsoleData: { name: "ConsoleData-test" }
	}
}));

const { db } = await import("../../src/db/service");

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

	it("builds global app hierarchy and resource ARN lookup keys", () => {
		const app = db.entities.app.get({ appName: "console" }).params();
		const appsByName = db.entities.app.query.byName({}).params();
		const stage = db.entities.stage
			.get({ appName: "console", stageName: "prod" })
			.params();
		const stagesByAccount = db.entities.stage.query
			.byAccount({ accountId: "123456789012" })
			.params();
		const resource = db.entities.resource
			.get({
				appName: "console",
				stageName: "prod",
				resourceId: "bucket"
			})
			.params();
		const byArn = db.entities.resource.query
			.byArn({ arnIndex: "arn:aws:s3:::console-bucket" })
			.params();

		expect(app.Key).toEqual({ pk: "APP#console", sk: "APP" });
		expect(appsByName.IndexName).toBe("appsByName");
		expect(stage.Key).toEqual({
			pk: "APP#console",
			sk: "STAGE#prod"
		});
		expect(stagesByAccount.IndexName).toBe("stagesByAccount");
		expect(resource.Key).toEqual({
			pk: "APP#console#STAGE#prod",
			sk: "RESOURCE#bucket"
		});
		expect(byArn.IndexName).toBe("resourcesByArn");
	});

	it("builds state snapshot keys", () => {
		const snapshot = db.entities.stateSnapshot
			.get({
				appName: "console",
				stageName: "prod",
				reverseTimestamp: "9999999999999",
				snapshotId: "state-version"
			})
			.params();

		expect(snapshot.Key).toEqual({
			pk: "APP#console#STAGE#prod",
			sk: "SNAPSHOT#9999999999999#state-version"
		});
	});

	it("removes ARN index fields from component groups", () => {
		const now = "2026-09-25T00:00:00.000Z";
		const component = db.entities.resource
			.upsert({
				accountId: "123456789012",
				appName: "console",
				stageName: "prod",
				resourceId: "realtime",
				resourceKind: "component",
				resourceType: "sst.aws.Realtime",
				urn: "urn:pulumi:prod::console::sst:aws:Realtime::Realtime",
				arnIndex: "component#realtime",
				name: "Realtime",
				updatedAt: now
			})
			.ifNotExists({ createdAt: now })
			.params();

		expect(component.UpdateExpression).toContain("REMOVE #gsi2pk, #gsi2sk");
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
