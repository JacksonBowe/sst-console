import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	find: vi.fn(),
	monitoring: vi.fn(),
	resources: vi.fn(),
	history: vi.fn(),
	removeStage: vi.fn(),
	removeIfEmpty: vi.fn(),
	publish: vi.fn()
}));
const requested = { type: "app.stage.projection_removal_requested" };
const removed = { type: "app.stage.removed" };
vi.mock("sst", () => ({ Resource: { Bus: { name: "bus" } } }));
vi.mock("sst/aws/bus", () => ({
	bus: {
		subscriber: (_events: unknown, callback: unknown) => callback,
		publish: mocks.publish
	}
}));
vi.mock("@console/core/actor", () => ({
	withActor: (_actor: unknown, callback: () => Promise<void>) => callback()
}));
vi.mock("@console/core/app", () => ({
	Events: {
		StageProjectionRemovalRequested: requested,
		StageRemoved: removed
	},
	Stage: { find: mocks.find, remove: mocks.removeStage },
	Resource: { remove: mocks.resources },
	removeIfEmpty: mocks.removeIfEmpty
}));
vi.mock("@console/core/state", () => ({ removeStageHistory: mocks.history }));
vi.mock("@console/core/issue", () => ({
	Monitoring: { removeStageMonitoring: mocks.monitoring }
}));

const { handler } = await import("../../src/events/app");
const input = { accountId: "123456789012", appName: "shop", stageName: "prod" };
const invoke = handler as unknown as (event: {
	type: string;
	properties: typeof input;
}) => Promise<void>;

describe("App event cleanup", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.find.mockResolvedValue({ accountId: input.accountId });
	});
	it("cleans dependencies before deleting the Stage and publishing", async () => {
		await invoke({ type: requested.type, properties: input });
		expect(mocks.monitoring).toHaveBeenCalledWith(input);
		expect(mocks.monitoring.mock.invocationCallOrder[0]).toBeLessThan(
			mocks.resources.mock.invocationCallOrder[0]!
		);
		expect(mocks.resources.mock.invocationCallOrder[0]).toBeLessThan(
			mocks.history.mock.invocationCallOrder[0]!
		);
		expect(mocks.history.mock.invocationCallOrder[0]).toBeLessThan(
			mocks.removeStage.mock.invocationCallOrder[0]!
		);
		expect(mocks.publish).toHaveBeenCalledWith(
			{ name: "bus" },
			removed,
			input
		);
	});
	it("publishes again when Stage is already gone", async () => {
		mocks.find.mockResolvedValue(null);
		await invoke({ type: requested.type, properties: input });
		expect(mocks.monitoring).not.toHaveBeenCalled();
		expect(mocks.publish).toHaveBeenCalledWith(
			{ name: "bus" },
			removed,
			input
		);
	});
	it("does not remove a Stage owned by another account", async () => {
		mocks.find.mockResolvedValue({ accountId: "999999999999" });
		await invoke({ type: requested.type, properties: input });
		expect(mocks.monitoring).not.toHaveBeenCalled();
		expect(mocks.publish).not.toHaveBeenCalled();
	});
	it("checks for an empty App after Stage removal", async () => {
		await invoke({ type: removed.type, properties: input });
		expect(mocks.removeIfEmpty).toHaveBeenCalledWith(input);
	});
});
