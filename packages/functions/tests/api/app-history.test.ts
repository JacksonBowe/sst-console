import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	stage: vi.fn(),
	updates: vi.fn(),
	update: vi.fn(),
	snapshot: vi.fn(),
	log: vi.fn(),
	events: vi.fn()
}));
vi.mock("@console/core/app", () => ({ Stage: { get: mocks.stage } }));
vi.mock("@console/core/state", () => ({
	Update: { list: mocks.updates, get: mocks.update },
	Snapshot: { get: mocks.snapshot },
	EventLog: { get: mocks.log },
	StateEvent: { list: mocks.events },
	stateErrors: { updateNotFound: () => new Error("Update not found") }
}));

const { appRoutes } = await import("../../src/api/app");
const app = new Hono().route("/apps", appRoutes);
const stage = { appName: "app", stageName: "prod" };
const key = { ...stage, updateId: "id" };

describe("Stage Update API", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mocks.stage.mockResolvedValue({ ...stage, accountId: "123456789012" });
	});
	it("lists only Updates after checking the Stage", async () => {
		mocks.updates.mockResolvedValue([{ updateId: "id" }]);
		const response = await app.request("/apps/app/stages/prod/updates");
		expect(await response.json()).toEqual([{ updateId: "id" }]);
		expect(mocks.stage).toHaveBeenCalledWith(stage);
		expect(mocks.updates).toHaveBeenCalledWith(stage);
		expect(mocks.snapshot).not.toHaveBeenCalled();
		expect(mocks.log).not.toHaveBeenCalled();
	});
	it("loads matching artifacts and events for one Update", async () => {
		mocks.update.mockResolvedValue({ updateId: "id" });
		mocks.snapshot.mockResolvedValue(null);
		mocks.log.mockResolvedValue({ updateId: "id" });
		mocks.events.mockResolvedValue([{ action: "created" }]);
		const response = await app.request("/apps/app/stages/prod/updates/id");
		expect(await response.json()).toEqual({
			update: { updateId: "id" },
			snapshot: null,
			eventLog: { updateId: "id" },
			events: [{ action: "created" }]
		});
		for (const mock of [
			mocks.update,
			mocks.snapshot,
			mocks.log,
			mocks.events
		])
			expect(mock).toHaveBeenCalledWith(key);
	});
	it("does not read history for a missing Stage", async () => {
		mocks.stage.mockRejectedValue(new Error("Stage not found"));
		const response = await app.request("/apps/app/stages/prod/updates/id");
		expect(response.status).toBe(500);
		expect(mocks.update).not.toHaveBeenCalled();
	});
	it("does not return artifacts for a missing Update", async () => {
		mocks.update.mockResolvedValue(null);
		const response = await app.request("/apps/app/stages/prod/updates/id");
		expect(response.status).toBe(500);
		expect(mocks.snapshot).not.toHaveBeenCalled();
		expect(mocks.log).not.toHaveBeenCalled();
	});
});
