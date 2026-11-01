import { describe, expect, it, vi } from "vitest";

vi.mock("sst", () => ({
	Resource: {
		ConsoleData: { name: "ConsoleData-test" },
		ConsoleConnections: { name: "ConsoleConnections-test" }
	}
}));

const { db } = await import("../../src/db/service");

describe("db service", () => {
	it("builds account and type listing keys", () => {
		const accountId = "123456789012";
		const get = db.entities.account.get({ accountId }).params();
		const list = db.entities.account.query.byType({}).params();

		expect(get).toMatchObject({
			TableName: "ConsoleData-test",
			Key: { pk: `ACCOUNT#${accountId}`, sk: "account" }
		});
		expect(list).toMatchObject({
			TableName: "ConsoleData-test",
			IndexName: "entitiesByType"
		});
	});

	it("builds user and Cognito identity keys", () => {
		const user = db.entities.user.get({ id: "user-id" }).params();
		const identity = db.entities.userIdentity
			.get({ cognitoSub: "cognito-sub" })
			.params();
		const usersByType = db.entities.user.query.byType({}).params();

		expect(user).toMatchObject({
			TableName: "ConsoleData-test",
			Key: { pk: "USER#user-id", sk: "user" }
		});
		expect(identity).toMatchObject({
			TableName: "ConsoleData-test",
			Key: { pk: "COGNITO#cognito-sub", sk: "user" }
		});
		expect(usersByType.IndexName).toBe("entitiesByType");
	});

	it("builds global app hierarchy and account listing keys", () => {
		const app = db.entities.app.get({ appName: "console" }).params();
		const appsByType = db.entities.app.query.byType({}).params();
		const stage = db.entities.stage
			.get({ appName: "console", stageName: "prod" })
			.params();
		const stagesByAwsAccount = db.entities.stage.query
			.byAwsAccount({ accountId: "123456789012" })
			.params();
		const resource = db.entities.resource
			.get({
				appName: "console",
				stageName: "prod",
				resourceId: "bucket"
			})
			.params();

		expect(app.Key).toEqual({ pk: "APP#console", sk: "APP" });
		expect(appsByType.IndexName).toBe("entitiesByType");
		expect(stage.Key).toEqual({
			pk: "APP#console",
			sk: "STAGE#prod"
		});
		expect(stagesByAwsAccount.IndexName).toBe("entitiesByAwsAccount");
		expect(resource.Key).toEqual({
			pk: "APP#console#STAGE#prod",
			sk: "RESOURCE#bucket"
		});
	});

	it("builds current State keys", () => {
		const state = db.entities.state
			.get({
				appName: "console",
				stageName: "prod"
			})
			.params();

		expect(state.Key).toEqual({
			pk: "APP#console#STAGE#prod",
			sk: "STATE"
		});
	});

	it("queries State Updates consistently from the Stage partition", () => {
		const query = db.entities.stateUpdate.query
			.update({ appName: "console", stageName: "prod" })
			.params({ consistent: true });
		expect(query.ConsistentRead).toBe(true);
		expect(query.IndexName).toBeUndefined();
		expect(Object.values(query.ExpressionAttributeValues ?? {})).toContain(
			"APP#console#STAGE#prod"
		);
		expect(Object.values(query.ExpressionAttributeValues ?? {})).toContain(
			"STATE_UPDATE#"
		);
	});

	it("guards State Update writes by Stage ownership", () => {
		const transaction = db.transaction
			.write(({ stage, stateUpdate }) => [
				stage
					.check({ appName: "console", stageName: "prod" })
					.where((a, op) => op.eq(a.accountId, "123456789012"))
					.commit(),
				stateUpdate
					.upsert({
						accountId: "123456789012",
						appName: "console",
						stageName: "prod",
						updateId: "1",
						sourceBucket: "bucket",
						sourceKey: "update/console/prod/1.json",
						observedAt: "2026-01-01T00:00:00.000Z",
						sstVersion: "4",
						command: "deploy",
						timeStarted: "2026-01-01T00:00:00Z",
						errors: [],
						errorsSourceCount: 0,
						errorsStoredCount: 0,
						errorsTruncated: false,
						reverseHistoryAt: "1"
					})
					.ifNotExists({ createdAt: "2026-01-01T00:00:00.000Z" })
					.commit()
			])
			.params();
		expect(transaction.TransactItems).toHaveLength(2);
		expect(transaction.TransactItems[0]).toMatchObject({
			ConditionCheck: {
				ConditionExpression: expect.stringContaining("accountId")
			}
		});
		expect(transaction.TransactItems[1]).toHaveProperty("Update");
	});

	it("builds account-scoped discovered stage keys", () => {
		const discovery = db.entities.discoveredStage
			.create({
				accountId: "691249328599",
				appName: "console",
				stageName: "prod",
				stateBucket: "sst-state",
				stateKey: "app/console/prod.json",
				discoveredAt: "2026-01-01T00:00:00.000Z"
			})
			.params();
		expect(discovery.Item).toMatchObject({
			pk: "ACCOUNT#691249328599",
			sk: "DISCOVERY#console#STAGE#prod",
			entityType: "DISCOVERED_STAGE",
			entitySort: "ACCOUNT#691249328599#APP#console#STAGE#prod",
			accountPk: "ACCOUNT#691249328599",
			accountSk: "DISCOVERY#console#prod"
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
