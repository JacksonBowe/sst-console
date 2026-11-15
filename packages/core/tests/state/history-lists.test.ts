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

	it("reads one consistent page and returns the continuation cursor", async () => {
		const cursor = Buffer.from(
			JSON.stringify({ pk: "APP#app#STAGE#prod", sk: "STATE_UPDATE#123" })
		).toString("base64url");
		const go = vi.fn().mockResolvedValue({
			data: [{ ...item, createdAt: item.observedAt }],
			cursor: "next"
		});
		mocks.updates.mockReturnValue({ go });
		const result = await Update.list({
			...input,
			limit: 10,
			cursor
		});
		expect(go).toHaveBeenCalledWith({
			limit: 10,
			cursor,
			consistent: true
		});
		expect(result.meta).toEqual({
			limit: 10,
			hasMore: true,
			nextCursor: "next"
		});
	});

	it("lists newest Updates first in SST key order, including unprocessed records", async () => {
		const newest = {
			...item,
			updateId: "100",
			sourceKey: "update/app/prod/100.json",
			createdAt: item.observedAt
		};
		const older = {
			...newest,
			updateId: "200",
			sourceKey: "update/app/prod/200.json",
			timeStarted: "2025-01-01T00:00:00Z"
		};
		const go = vi.fn().mockResolvedValue({ data: [newest, older] });
		mocks.updates.mockReturnValue({ go });
		expect((await Update.list(input)).items).toEqual([newest, older]);
		expect(go).toHaveBeenCalledWith({ pages: "all", consistent: true });
	});

	it.each([
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
