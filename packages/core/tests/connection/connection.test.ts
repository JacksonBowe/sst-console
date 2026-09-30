import { describe, expect, it, vi } from "vitest";

vi.mock("sst", () => ({
	Resource: {
		ConsoleConnections: { name: "ConsoleConnections-test" }
	}
}));

const { connections } = await import("../../src/connection");

describe("connection entity", () => {
	it("stores all durable connections in one recovery-queryable partition", () => {
		const query = connections.entities.connection.query
			.connection({})
			.params();
		const get = connections.entities.connection
			.get({ accountId: "123456789012" })
			.params();

		expect(query).toMatchObject({
			TableName: "ConsoleConnections-test",
			KeyConditionExpression: expect.any(String),
			ExpressionAttributeValues: expect.objectContaining({
				":pk": "CONNECTIONS"
			})
		});
		expect(get.Key).toEqual({
			pk: "CONNECTIONS",
			sk: "ACCOUNT#123456789012"
		});
	});

	it("defaults new Workloads to sync every discovered stage", () => {
		const create = connections.entities.connection
			.create({
				accountId: "123456789012",
				region: "us-east-1",
				roleArn: "arn:aws:iam::123456789012:role/SSTConsoleRole",
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-01T00:00:00.000Z"
			})
			.params();

		expect(create.Item.syncPolicy).toEqual({
			allowList: [],
			ignoreList: []
		});
	});

	it("includes every update placeholder in DynamoDB expression values", () => {
		const params = connections.entities.connection
			.update({ accountId: "123456789012" })
			.ifNotExists({ createdAt: "2026-01-01T00:00:00.000Z" })
			.set({
				region: "us-east-1",
				roleArn: "arn:aws:iam::123456789012:role/SSTConsoleRole",
				updatedAt: "2026-01-01T00:00:00.000Z"
			})
			.params();
		const placeholders = params.UpdateExpression?.match(/:\w+/g) ?? [];

		for (const placeholder of placeholders)
			expect(params.ExpressionAttributeValues).toHaveProperty(
				placeholder
			);
	});
});
