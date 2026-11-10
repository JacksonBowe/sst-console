import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	updates: vi.fn(),
	snapshots: vi.fn(),
	logs: vi.fn()
}));
vi.mock("../../src/account/connector", () => ({}));
vi.mock("../../src/account/account", () => ({}));
vi.mock("../../src/connection", () => ({}));
vi.mock("../../src/app/app.stage", () => ({}));
vi.mock("../../src/state/sst", () => ({}));
vi.mock("../../src/db", () => ({
	db: {
		entities: {
			stateUpdate: { query: { update: mocks.updates } },
			stateSnapshot: { query: { snapshot: mocks.snapshots } },
			stateEventLog: { query: { eventLog: mocks.logs } }
		}
	}
}));

const Update = await import("../../src/state/update");
const Snapshot = await import("../../src/state/snapshot");
const EventLog = await import("../../src/state/event-log");
const input = { accountId: "123456789012", appName: "app", stageName: "prod" };
const item = {
	...input,
	updateId: "id",
	sourceBucket: "bucket",
	sourceKey: "key",
	observedAt: "2026-01-01T00:00:00Z"
};

describe("Stage history listing", () => {
	beforeEach(() => vi.clearAllMocks());

	it.each([
		[Update.list, "updates", { ...item, createdAt: item.observedAt }],
		[
			Snapshot.list,
			"snapshots",
			{ ...item, lastModified: item.observedAt }
		],
		[EventLog.list, "logs", { ...item, lastModified: item.observedAt }]
	] as const)(
		"lists history from the Stage partition",
		async (list, query, record) => {
			const go = vi.fn().mockResolvedValue({ data: [record] });
			mocks[query].mockReturnValue({ go });
			expect(await list(input)).toEqual([record]);
			expect(mocks[query]).toHaveBeenCalledWith({
				appName: "app",
				stageName: "prod"
			});
			expect(go).toHaveBeenCalledWith({ pages: "all", consistent: true });
		}
	);
});
