import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	publish: vi.fn(),
	find: vi.fn(),
	policy: vi.fn(),
	includes: vi.fn(),
	stage: vi.fn(),
	update: vi.fn(),
	snapshot: vi.fn(),
	log: vi.fn()
}));

vi.mock("sst", () => ({ Resource: { Bus: "bus" } }));
vi.mock("sst/aws/bus", () => ({ bus: { publish: mocks.publish } }));
vi.mock("../../src/account/account", () => ({ find: mocks.find }));
vi.mock("../../src/connection", () => ({
	getSyncPolicy: mocks.policy,
	Policy: { includesStage: mocks.includes }
}));
vi.mock("../../src/db", () => ({ db: {} }));
vi.mock("../../src/app/app.stage", () => ({
	assertStageOwnership: mocks.stage
}));
vi.mock("../../src/state/events", () => ({
	Events: {
		UpdateCreated: "update",
		SnapshotCreated: "snapshot",
		EventLogCreated: "log"
	}
}));
vi.mock("../../src/state/update", () => ({ get: mocks.update }));
vi.mock("../../src/state/snapshot", () => ({ get: mocks.snapshot }));
vi.mock("../../src/state/event-log", () => ({ get: mocks.log }));
vi.mock("../../src/state/resource-event", () => ({}));

const { processHistory } = await import("../../src/state/state");
const input = {
	accountId: "123456789012",
	appName: "app",
	stageName: "prod",
	updateId: "id"
};

describe("historical processing", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.find.mockResolvedValue({
			status: "connected",
			stateBucket: "bucket"
		});
		mocks.policy.mockResolvedValue({});
		mocks.includes.mockReturnValue(true);
		mocks.stage.mockResolvedValue(undefined);
		for (const [get, prefix] of [
			[mocks.update, "update"],
			[mocks.snapshot, "snapshot"],
			[mocks.log, "eventlog"]
		] as const)
			get.mockResolvedValue({
				sourceBucket: "bucket",
				sourceKey: `${prefix}/app/prod/id.json`
			});
	});

	it("publishes the existing events for discovered artifacts", async () => {
		await expect(processHistory(input)).resolves.toEqual({ published: 3 });
		expect(mocks.stage).toHaveBeenCalledWith({
			accountId: input.accountId,
			appName: input.appName,
			stageName: input.stageName
		});
		for (const get of [mocks.update, mocks.snapshot, mocks.log])
			expect(get).toHaveBeenCalledWith({
				appName: "app",
				stageName: "prod",
				updateId: "id"
			});
		expect(mocks.publish).toHaveBeenCalledWith("bus", "update", {
			accountId: input.accountId,
			stateBucket: "bucket",
			stateKey: "update/app/prod/id.json",
			historical: true
		});
		expect(mocks.publish).toHaveBeenCalledWith(
			"bus",
			"snapshot",
			expect.objectContaining({ stateKey: "snapshot/app/prod/id.json" })
		);
		expect(mocks.publish).toHaveBeenCalledWith(
			"bus",
			"log",
			expect.objectContaining({ stateKey: "eventlog/app/prod/id.json" })
		);
	});

	it("rejects Stages owned by another account", async () => {
		mocks.stage.mockRejectedValue(new Error("not owned"));
		await expect(processHistory(input)).rejects.toThrow("not owned");
		expect(mocks.publish).not.toHaveBeenCalled();
	});

	it("rejects excluded Stages", async () => {
		mocks.includes.mockReturnValue(false);
		await expect(processHistory(input)).rejects.toMatchObject({
			code: "state.stage_not_tracked"
		});
		expect(mocks.update).not.toHaveBeenCalled();
	});

	it("skips missing artifacts and artifacts from another bucket", async () => {
		mocks.update.mockResolvedValue(null);
		mocks.snapshot.mockResolvedValue({
			sourceBucket: "other",
			sourceKey: "key"
		});
		await expect(processHistory(input)).resolves.toEqual({ published: 1 });
		expect(mocks.publish).toHaveBeenCalledTimes(1);
	});
});
