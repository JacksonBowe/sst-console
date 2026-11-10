import { describe, expect, it, vi } from "vitest";

vi.mock("sst", () => ({
	Resource: {
		ConsoleData: { name: "ConsoleData-test" },
		ConsoleConnections: { name: "ConsoleConnections-test" }
	}
}));

const { db } = await import("../../src/db/service");

describe("db service", () => {
	it("lists each Stage history artifact using its primary-key prefix", () => {
		const key = { appName: "console", stageName: "prod" };
		for (const [params, prefix] of [
			[
				db.entities.stateUpdate.query
					.update(key)
					.params({ consistent: true }),
				"STATE_UPDATE#"
			],
			[
				db.entities.stateSnapshot.query
					.snapshot(key)
					.params({ consistent: true }),
				"STATE_SNAPSHOT#"
			],
			[
				db.entities.stateEventLog.query
					.eventLog(key)
					.params({ consistent: true }),
				"STATE_EVENT_LOG#"
			]
		] as const) {
			expect(params.IndexName).toBeUndefined();
			expect(params.ConsistentRead).toBe(true);
			expect(
				Object.values(params.ExpressionAttributeValues ?? {})
			).toContain(prefix);
		}
	});
	it("keys snapshot and event-log locators by Stage and Update", () => {
		const key = { appName: "console", stageName: "prod", updateId: "1" };
		expect(db.entities.stateSnapshot.get(key).params().Key).toEqual({
			pk: "APP#console#STAGE#prod",
			sk: "STATE_SNAPSHOT#1"
		});
		expect(db.entities.stateEventLog.get(key).params().Key).toEqual({
			pk: "APP#console#STAGE#prod",
			sk: "STATE_EVENT_LOG#1"
		});
		const query = db.entities.stateSnapshot.query
			.snapshot({
				appName: "console",
				stageName: "prod"
			})
			.params({ consistent: true });
		expect(query.ConsistentRead).toBe(true);
		expect(query.IndexName).toBeUndefined();
		expect(Object.values(query.ExpressionAttributeValues ?? {})).toContain(
			"STATE_SNAPSHOT#"
		);
		const source = {
			...key,
			accountId: "123456789012",
			sourceBucket: "bucket",
			sourceKey: "source",
			observedAt: "2026-01-01T00:00:00Z",
			lastModified: "2026-01-01T00:00:00Z"
		};
		for (const [item, byType, type] of [
			[
				db.entities.stateSnapshot.put(source).params().Item,
				db.entities.stateSnapshot.query.byType({}).params(),
				"STATE_SNAPSHOT"
			],
			[
				db.entities.stateEventLog.put(source).params().Item,
				db.entities.stateEventLog.query.byType({}).params(),
				"STATE_EVENT_LOG"
			]
		] as const) {
			expect(item.entityType).toBe(type);
			expect(item.entitySort).toContain("APP#console#STAGE#prod");
			expect(byType.IndexName).toBe("entitiesByType");
			expect(
				Object.values(byType.ExpressionAttributeValues ?? {})
			).toContain(type);
		}
		expect(
			db.entities.stateSnapshot.put(source).params().Item.schemaVersion
		).toBe("3");
		expect(
			db.entities.stateEventLog.put(source).params().Item.schemaVersion
		).toBe("1");
	});

	it("provides an entity-type index for every ConsoleData entity", () => {
		const entities = Object.values(db.entities) as unknown as Array<{
			query: {
				byType: (input: Record<string, never>) => {
					params: () => { IndexName?: string };
				};
			};
		}>;
		for (const entity of entities) {
			const query = entity.query.byType({}).params();
			expect(query.IndexName).toBe("entitiesByType");
		}
	});

	it("guards Snapshot and Event Log writes by Stage ownership", () => {
		const source = {
			appName: "console",
			stageName: "prod",
			updateId: "1",
			accountId: "123456789012",
			sourceBucket: "bucket",
			sourceKey: "source",
			lastModified: "2026-01-01T00:00:00Z",
			observedAt: "2026-01-01T00:00:00Z"
		};
		for (const kind of ["snapshot", "eventLog"] as const) {
			const params = db.transaction
				.write(({ stage, stateSnapshot, stateEventLog }) => [
					stage
						.check(source)
						.where((a, op) => op.eq(a.accountId, source.accountId))
						.commit(),
					kind === "snapshot"
						? stateSnapshot.put(source).commit()
						: stateEventLog.put(source).commit()
				])
				.params();
			expect(params.TransactItems[0]).toHaveProperty("ConditionCheck");
			expect(params.TransactItems[1]).toMatchObject({
				Put: {
					Item: {
						entityType:
							kind === "snapshot"
								? "STATE_SNAPSHOT"
								: "STATE_EVENT_LOG"
					}
				}
			});
		}
	});
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
		const item = db.entities.state
			.put({
				appName: "console",
				stageName: "prod",
				accountId: "123456789012",
				sourceBucket: "bucket",
				sourceKey: "app/console/prod.json",
				observedAt: "2026-01-01T00:00:00Z"
			})
			.params().Item;
		expect(item.entityType).toBe("STATE");
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

	it("can create a historical Update without inventing an S3 sequencer", () => {
		const params = db.entities.stateUpdate
			.create({
				accountId: "123456789012",
				appName: "console",
				stageName: "prod",
				updateId: "1",
				sourceBucket: "bucket",
				sourceKey: "update/console/prod/1.json",
				observedAt: "2026-01-01T00:00:00.000Z",
				sstVersion: "4",
				command: "deploy",
				timeStarted: "2026-01-01T00:00:00.000Z",
				errors: [],
				errorsSourceCount: 0,
				errorsStoredCount: 0,
				errorsTruncated: false,
				createdAt: "2026-01-01T00:00:00.000Z"
			})
			.params();
		expect(params.Item.sequencer).toBeUndefined();
		expect(params.Item.entityType).toBe("STATE_UPDATE");
		expect(params.ConditionExpression).toBeDefined();
	});

	it("indexes a partial discovered Update by SST key", () => {
		const item = db.entities.stateUpdate
			.create({
				accountId: "123456789012",
				appName: "console",
				stageName: "prod",
				updateId: "update-id",
				sourceBucket: "bucket",
				sourceKey: "update/console/prod/update-id.json",
				observedAt: "2026-01-01T00:00:00Z",
				createdAt: "2026-01-01T00:00:00Z"
			})
			.params().Item;
		expect(item.lookupPk).toBe("STATE_UPDATE#console#prod");
		expect(item.lookupSk).toBe("STATE_UPDATE#update-id");
		expect(item.command).toBeUndefined();
		expect(item.processedAt).toBeUndefined();
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
});
