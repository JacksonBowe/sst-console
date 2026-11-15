import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("sst", () => ({
	Resource: {
		ConsoleData: { name: "test" },
		ConsoleConnections: { name: "test" }
	}
}));

const Update = await import("../../src/state/update");
const Snapshot = await import("../../src/state/snapshot");
const EventLog = await import("../../src/state/event-log");
const { dynamo } = await import("../../src/db/client");
const source = {
	accountId: "123456789012",
	appName: "app",
	stageName: "prod",
	updateId: "id",
	sourceBucket: "bucket",
	sourceKey: "source",
	observedAt: "2026-01-01T00:00:00Z",
	lastModified: "2026-01-01T00:00:00Z"
};

describe("discovered artifact writes", () => {
	afterEach(() => vi.restoreAllMocks());
	it.each([Update.create, Snapshot.create, EventLog.create])(
		"guards ownership and creates without replacing",
		async create => {
			const send = vi
				.spyOn(dynamo, "send")
				.mockResolvedValue({} as never);
			await expect(create(source)).resolves.toBe(true);
			const command = send.mock.calls[0]![0] as unknown as {
				input: {
					TransactItems: Array<{
						ConditionCheck?: { ConditionExpression: string };
						Put?: { ConditionExpression: string };
					}>;
				};
			};
			expect(
				command.input.TransactItems[0]?.ConditionCheck
					?.ConditionExpression
			).toContain("accountId");
			expect(
				command.input.TransactItems[1]?.Put?.ConditionExpression
			).toContain("attribute_not_exists");
		}
	);
	it.each([Update.create, Snapshot.create, EventLog.create])(
		"validates discovered artifact input before writing",
		create => {
			const send = vi.spyOn(dynamo, "send");
			expect(() => create({ ...source, accountId: "invalid" })).toThrow();
			expect(send).not.toHaveBeenCalled();
		}
	);
});
