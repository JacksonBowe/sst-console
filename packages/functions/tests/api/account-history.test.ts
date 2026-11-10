import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const mocks = vi.hoisted(() => ({
	ownership: vi.fn(),
	processHistory: vi.fn(),
	updates: vi.fn(),
	snapshots: vi.fn(),
	logs: vi.fn()
}));
vi.mock("@console/core/state", () => ({
	processHistory: mocks.processHistory,
	Update: { list: mocks.updates },
	Snapshot: { list: mocks.snapshots },
	EventLog: { list: mocks.logs }
}));
vi.mock("@console/core/app", () => ({
	Stage: { assertStageOwnership: mocks.ownership }
}));
vi.mock("@console/core/account", () => ({}));
vi.mock("@console/core/connection", () => ({
	AccountSyncPolicySchema: z.object({})
}));

const { accountRoutes } = await import("../../src/api/account");
const input = { accountId: "123456789012", appName: "app", stageName: "prod" };

describe("Stage history API", () => {
	beforeEach(() => vi.resetAllMocks());
	it("processes a selected Update", async () => {
		mocks.processHistory.mockResolvedValue({ published: 3 });
		const app = new Hono().route("/accounts", accountRoutes);
		const response = await app.request(
			"/accounts/123456789012/state/app/prod/updates/id/process",
			{ method: "POST" }
		);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ published: 3 });
		expect(mocks.processHistory).toHaveBeenCalledWith({
			...input,
			updateId: "id"
		});
	});
	it.each([
		["updates", "updates"],
		["snapshots", "snapshots"],
		["event-logs", "logs"]
	] as const)("lists %s", async (kind, query) => {
		mocks[query].mockResolvedValue([{ updateId: "id" }]);
		const app = new Hono().route("/accounts", accountRoutes);
		const response = await app.request(
			`/accounts/123456789012/state/app/prod/${kind}`
		);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual([{ updateId: "id" }]);
		expect(mocks.ownership).toHaveBeenCalledWith(input);
		expect(mocks[query]).toHaveBeenCalledWith(input);
	});
	it.each([
		["updates", "updates"],
		["snapshots", "snapshots"],
		["event-logs", "logs"]
	] as const)(
		"does not list %s when ownership fails",
		async (kind, query) => {
			mocks.ownership.mockRejectedValue(new Error("not owned"));
			const app = new Hono().route("/accounts", accountRoutes);
			const response = await app.request(
				`/accounts/123456789012/state/app/prod/${kind}`
			);
			expect(response.status).toBe(500);
			expect(mocks[query]).not.toHaveBeenCalled();
		}
	);
});
