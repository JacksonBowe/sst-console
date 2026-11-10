import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	snapshot: vi.fn(),
	eventLog: vi.fn(),
	find: vi.fn()
}));
vi.mock("sst/aws/bus", () => ({
	bus: { subscriber: (_events: unknown, handler: unknown) => handler }
}));
vi.mock("@console/core/actor", () => ({
	withActor: (_actor: unknown, callback: () => Promise<void>) => callback()
}));
vi.mock("@console/core/account", () => ({ find: mocks.find }));
vi.mock("@console/core/state", () => ({
	Events: {
		UpdateCreated: { type: "update" },
		SnapshotCreated: { type: "snapshot" },
		StateUpdated: { type: "state" },
		EventLogCreated: { type: "eventlog" }
	},
	Snapshot: { receiveSnapshot: mocks.snapshot },
	EventLog: { receiveEventLog: mocks.eventLog }
}));

const { handler } = await import("../../src/events/state");

describe("State artifact events", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.find.mockResolvedValue({
			status: "connected",
			stateBucket: "bucket"
		});
	});

	it("routes Snapshot and Event Log events to their owning modules", async () => {
		const properties = {
			accountId: "123456789012",
			stateBucket: "bucket",
			stateKey: "snapshot/app/prod/id.json"
		};
		await handler(
			{ type: "snapshot", properties } as never,
			{} as never,
			() => {}
		);
		expect(mocks.snapshot).toHaveBeenCalledWith(properties);
		expect(mocks.eventLog).not.toHaveBeenCalled();
		const log = { ...properties, stateKey: "eventlog/app/prod/id.json" };
		await handler(
			{ type: "eventlog", properties: log } as never,
			{} as never,
			() => {}
		);
		expect(mocks.eventLog).toHaveBeenCalledWith(log);
	});
});
