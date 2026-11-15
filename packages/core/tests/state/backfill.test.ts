import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	send: vi.fn(),
	stage: vi.fn(),
	receiveArtifact: vi.fn(),
	receiveUpdate: vi.fn(),
	listSnapshots: vi.fn(),
	includesStage: vi.fn(),
	rows: new Map<string, unknown>()
}));
vi.mock("@aws-sdk/client-s3", () => ({
	S3Client: class {
		send = mocks.send;
	},
	ListObjectsV2Command: class {
		constructor(public input: unknown) {}
	}
}));
vi.mock("../../src/account/connector", () => ({
	connect: async () => ({
		account: {
			status: "connected",
			stateBucket: "bucket",
			region: "us-east-1"
		},
		connection: { credentials: {} }
	})
}));
vi.mock("../../src/connection", () => ({
	getSyncPolicy: async () => ({}),
	Policy: { includesStage: mocks.includesStage }
}));
vi.mock("../../src/db", () => ({
	db: {
		entities: {
			stage: { get: mocks.stage },
			...Object.fromEntries(
				["stateUpdate", "stateSnapshot", "stateEventLog"].map(kind => [
					kind,
					{
						get: (key: { updateId: string }) => ({
							go: async () => ({
								data: mocks.rows.get(`${kind}/${key.updateId}`)
							})
						})
					}
				])
			)
		},
		transaction: {
			write: (callback: (entities: any) => Array<() => void>) => ({
				go: async () => {
					const entity = (kind: string) => ({
						create: (item: any) => ({
							commit: () => () =>
								mocks.rows.set(`${kind}/${item.updateId}`, item)
						})
					});
					callback({
						stage: {
							check: () => ({
								where: () => ({ commit: () => () => {} })
							})
						},
						stateUpdate: entity("stateUpdate"),
						stateSnapshot: entity("stateSnapshot"),
						stateEventLog: entity("stateEventLog")
					}).forEach(write => write());
					return { canceled: false };
				}
			})
		}
	}
}));
vi.mock("../../src/state/snapshot", () => ({
	receiveSnapshot: mocks.receiveArtifact,
	list: mocks.listSnapshots,
	create: async (input: { updateId: string }) => {
		const key = `stateSnapshot/${input.updateId}`;
		if (mocks.rows.has(key)) return false;
		mocks.rows.set(key, input);
		return true;
	}
}));
vi.mock("../../src/state/event-log", () => ({
	receiveEventLog: mocks.receiveArtifact,
	create: async (input: { updateId: string }) => {
		const key = `stateEventLog/${input.updateId}`;
		if (mocks.rows.has(key)) return false;
		mocks.rows.set(key, input);
		return true;
	}
}));
vi.mock("../../src/state/update", () => ({
	receiveUpdate: mocks.receiveUpdate,
	create: async (input: { updateId: string }) => {
		const key = `stateUpdate/${input.updateId}`;
		if (mocks.rows.has(key)) return false;
		mocks.rows.set(key, input);
		return true;
	}
}));

const { backfill } = await import("../../src/state/discovery");
const input = { accountId: "123456789012", appName: "app", stageName: "prod" };
const stage = {
	...input,
	region: "us-east-1",
	issueMonitoringEnabled: false,
	createdAt: "2026-01-01T00:00:00Z",
	updatedAt: "2026-01-01T00:00:00Z"
};

describe("Stage history backfill", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.rows.clear();
		mocks.includesStage.mockReturnValue(true);
		mocks.stage.mockReturnValue({
			go: async () => ({ data: stage })
		});
		mocks.receiveArtifact.mockResolvedValue({ status: "synced" });
		mocks.receiveUpdate.mockResolvedValue({ status: "synced" });
		mocks.listSnapshots.mockResolvedValue([]);
	});
	afterEach(() => vi.restoreAllMocks());

	it("skips unrelated keys and reports artifact failures", async () => {
		const log = vi.spyOn(console, "log").mockImplementation(() => {});
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		mocks.send
			.mockResolvedValueOnce({
				Contents: [{ Key: "update/app/prod/id.json" }]
			})
			.mockResolvedValueOnce({
				Contents: [
					{
						Key: "snapshot/app/prod/id.json",
						LastModified: new Date("2026-01-01")
					},
					{ Key: "snapshot/other/prod/id.json" }
				]
			})
			.mockResolvedValueOnce({
				Contents: [{ Key: "eventlog/app/prod/id.json" }]
			});
		const result = await backfill(input);
		expect(result).toMatchObject({
			processed: 2,
			skipped: 1,
			failed: 1,
			failures: [
				{
					key: expect.any(String),
					reason: "Artifact processing failed"
				}
			]
		});
		expect(mocks.receiveUpdate).not.toHaveBeenCalled();
		expect(JSON.stringify(result)).not.toContain("sensitive detail");
		expect(log).toHaveBeenCalledWith(
			"State history backfill listing complete",
			{ ...input, total: 4 }
		);
		expect(log).toHaveBeenCalledWith(
			"State history backfill complete",
			expect.objectContaining({ processed: 2, skipped: 1, failed: 1 })
		);
		expect(warn).toHaveBeenCalledWith(
			"State history backfill artifact failed",
			expect.objectContaining({ error: "processing_error" })
		);
		expect(
			JSON.stringify([...log.mock.calls, ...warn.mock.calls])
		).not.toContain("sensitive detail");
	});

	it("fails before processing when a listing fails", async () => {
		vi.spyOn(console, "log").mockImplementation(() => {});
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		mocks.send
			.mockResolvedValueOnce({
				Contents: [{ Key: "update/app/prod/id.json" }]
			})
			.mockRejectedValueOnce(new Error("listing failed"));
		await expect(backfill(input)).rejects.toThrow("listing failed");
		expect(mocks.receiveUpdate).not.toHaveBeenCalled();
		expect(warn).toHaveBeenCalledWith(
			"State history backfill listing failed",
			expect.objectContaining({
				prefix: "snapshot/app/prod/",
				error: "processing_error"
			})
		);
	});

	it("lists only the requested Stage prefixes", async () => {
		vi.spyOn(console, "log").mockImplementation(() => {});
		mocks.send.mockResolvedValue({ Contents: [] });
		await backfill(input);
		expect(
			mocks.send.mock.calls.map(([command]) => command.input.Prefix)
		).toEqual([
			"update/app/prod/",
			"snapshot/app/prod/",
			"eventlog/app/prod/"
		]);
	});

	it("discovers locators without processing artifacts", async () => {
		vi.spyOn(console, "log").mockImplementation(() => {});
		mocks.send
			.mockResolvedValueOnce({
				Contents: [
					{
						Key: "update/app/prod/id.json",
						LastModified: new Date("2026-02-01")
					}
				]
			})
			.mockResolvedValueOnce({
				Contents: [
					{
						Key: "snapshot/app/prod/id.json",
						LastModified: new Date("2026-01-01")
					}
				]
			})
			.mockResolvedValueOnce({ Contents: [] });
		await backfill(input);
		expect(mocks.listSnapshots).not.toHaveBeenCalled();
		expect(mocks.receiveUpdate).not.toHaveBeenCalled();
		expect(mocks.receiveArtifact).not.toHaveBeenCalled();
		expect(mocks.rows.get("stateUpdate/id")).toMatchObject({
			sourceKey: "update/app/prod/id.json"
		});
		expect(mocks.rows.get("stateSnapshot/id")).toMatchObject({
			sourceKey: "snapshot/app/prod/id.json"
		});
	});

	it("preserves previously processed locators during discovery", async () => {
		vi.spyOn(console, "log").mockImplementation(() => {});
		const existing = {
			processedAt: "2026-01-01T00:00:00Z",
			command: "deploy"
		};
		mocks.rows.set("stateUpdate/id", existing);
		mocks.send
			.mockResolvedValueOnce({
				Contents: [{ Key: "update/app/prod/id.json" }]
			})
			.mockResolvedValueOnce({ Contents: [] })
			.mockResolvedValueOnce({ Contents: [] });
		await expect(backfill(input)).resolves.toMatchObject({
			processed: 0,
			skipped: 1
		});
		expect(mocks.rows.get("stateUpdate/id")).toEqual(existing);
	});

	it("does not list artifacts when the Stage is excluded, untracked or owned by another account", async () => {
		vi.spyOn(console, "log").mockImplementation(() => {});
		mocks.includesStage.mockReturnValueOnce(false);
		await expect(backfill(input)).rejects.toThrow("Stage is not tracked");
		mocks.stage.mockReturnValueOnce({ go: async () => ({ data: null }) });
		await expect(backfill(input)).rejects.toThrow(
			"SST stage was not found"
		);
		mocks.stage.mockReturnValueOnce({
			go: async () => ({ data: { ...stage, accountId: "999999999999" } })
		});
		await expect(backfill(input)).rejects.toThrow(
			"SST stage was not found"
		);
		expect(mocks.send).not.toHaveBeenCalled();
		expect(mocks.receiveUpdate).not.toHaveBeenCalled();
		expect(mocks.receiveArtifact).not.toHaveBeenCalled();
	});

	it("rejects names containing path separators", async () => {
		expect(() => backfill({ ...input, stageName: "prod/other" })).toThrow();
		expect(mocks.send).not.toHaveBeenCalled();
	});
});
