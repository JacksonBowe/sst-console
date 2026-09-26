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
});
