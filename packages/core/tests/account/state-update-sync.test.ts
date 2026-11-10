import { gzipSync } from "node:zlib";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	find: vi.fn(),
	updateAccount: vi.fn(),
	assume: vi.fn(),
	policy: vi.fn(),
	includes: vi.fn(),
	stageGet: vi.fn(),
	updateGet: vi.fn(),
	send: vi.fn(),
	write: vi.fn()
}));

vi.mock("@aws-sdk/client-s3", async importOriginal => {
	const actual = await importOriginal<typeof import("@aws-sdk/client-s3")>();
	return {
		...actual,
		S3Client: class {
			send = mocks.send;
		}
	};
});
vi.mock("../../src/account/account", () => ({
	find: mocks.find,
	update: mocks.updateAccount
}));
vi.mock("../../src/account/connector", () => ({
	connect: async () => ({
		account: await mocks.find(),
		connection: await mocks.assume()
	})
}));
vi.mock("../../src/connection", () => ({
	getSyncPolicy: mocks.policy,
	Policy: { includesStage: mocks.includes }
}));
vi.mock("../../src/db", () => ({
	db: {
		entities: {
			stage: { get: mocks.stageGet },
			stateUpdate: { get: mocks.updateGet }
		},
		transaction: { write: mocks.write }
	}
}));
vi.mock("../../src/issue/monitoring", () => ({}));

const { receiveUpdate } = await import("../../src/state/update");
const input = {
	accountId: "123456789012",
	appName: "app",
	stageName: "dev",
	updateId: "id",
	sequencer: "0".repeat(255) + "1"
};
const stage = {
	appName: input.appName,
	stageName: input.stageName,
	accountId: input.accountId,
	region: "us-east-1",
	issueMonitoringEnabled: false,
	createdAt: "2026-01-01T00:00:00Z",
	updatedAt: "2026-01-01T00:00:00Z"
};
const update = {
	...input,
	sourceBucket: "bucket",
	sourceKey: "update/app/dev/id.json",
	observedAt: "2026-01-01T00:00:00Z",
	createdAt: "2026-01-01T00:00:00Z"
};

describe("State Update sync", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.find.mockResolvedValue({
			status: "connected",
			stateBucket: "bucket",
			roleArn: "role",
			region: "us-east-1"
		});
		mocks.policy.mockResolvedValue({});
		mocks.includes.mockReturnValue(true);
		mocks.stageGet.mockReturnValue({
			go: vi.fn().mockResolvedValue({ data: null })
		});
		mocks.updateGet.mockReturnValue({
			go: vi.fn().mockResolvedValue({ data: null })
		});
		mocks.assume.mockResolvedValue({
			accountId: input.accountId,
			credentials: {}
		});
		mocks.send.mockResolvedValue({
			ContentEncoding: "gzip",
			Body: {
				transformToByteArray: async () =>
					gzipSync(
						JSON.stringify({
							id: "id",
							version: "4",
							command: "deploy",
							timeStarted: "2026-01-01T00:00:00Z",
							errors: []
						})
					)
			}
		});
		mocks.write.mockReturnValue({
			go: vi.fn().mockResolvedValue({ canceled: false })
		});
	});

	it("creates a Stage and ingests a compressed update before current State exists", async () => {
		await expect(receiveUpdate(input)).resolves.toMatchObject({
			status: "synced"
		});
		expect(mocks.write).toHaveBeenCalledTimes(2);
	});

	it("ignores a Stage owned by another account", async () => {
		mocks.stageGet.mockReturnValue({
			go: vi.fn().mockResolvedValue({
				data: { ...stage, accountId: "999999999999" }
			})
		});
		await expect(receiveUpdate(input)).resolves.toMatchObject({
			status: "ignored"
		});
		expect(mocks.send).not.toHaveBeenCalled();
	});

	it("refreshes existing Update metadata during historical processing", async () => {
		mocks.stageGet.mockReturnValue({
			go: async () => ({ data: stage })
		});
		mocks.updateGet.mockReturnValue({
			go: async () => ({ data: update })
		});
		await expect(
			receiveUpdate({ ...input, replay: true })
		).resolves.toMatchObject({ status: "synced" });
		expect(mocks.send).toHaveBeenCalled();
		expect(mocks.write).toHaveBeenCalled();
	});

	it("skips historical processing when a live sequencer changes", async () => {
		mocks.stageGet.mockReturnValue({
			go: async () => ({ data: stage })
		});
		mocks.updateGet
			.mockReturnValueOnce({
				go: async () => ({ data: update })
			})
			.mockReturnValueOnce({
				go: async () => ({
					data: { ...update, sequencer: "0".repeat(255) + "2" }
				})
			});
		mocks.write.mockReturnValueOnce({
			go: async () => ({ canceled: true })
		});
		await expect(
			receiveUpdate({ ...input, replay: true })
		).resolves.toMatchObject({ status: "ignored" });
	});

	it("reports empty and invalid replay artifacts as State domain errors", async () => {
		mocks.stageGet.mockReturnValue({
			go: async () => ({ data: stage })
		});
		mocks.send.mockResolvedValueOnce({ Body: undefined });
		await expect(
			receiveUpdate({ ...input, replay: true })
		).rejects.toMatchObject({ code: "state.update_empty", status: 500 });
		mocks.send.mockResolvedValueOnce({
			Body: {
				transformToByteArray: async () => new TextEncoder().encode("{}")
			}
		});
		await expect(
			receiveUpdate({ ...input, replay: true })
		).rejects.toMatchObject({ code: "state.update_invalid", status: 500 });
	});

	it("reports a failed historical Update write as a State domain error", async () => {
		mocks.stageGet.mockReturnValue({
			go: async () => ({ data: stage })
		});
		mocks.write.mockReturnValueOnce({
			go: async () => ({ canceled: true })
		});
		await expect(
			receiveUpdate({ ...input, replay: true })
		).rejects.toMatchObject({
			code: "state.historical_update_persistence_failed",
			status: 500
		});
	});

	it("ignores excluded Stages and propagates S3 permission errors", async () => {
		mocks.includes.mockReturnValue(false);
		await expect(receiveUpdate(input)).resolves.toMatchObject({
			status: "ignored"
		});
		expect(mocks.send).not.toHaveBeenCalled();

		mocks.includes.mockReturnValue(true);
		const denied = Object.assign(new Error("S3 access denied"), {
			name: "AccessDenied"
		});
		mocks.send.mockRejectedValueOnce(denied);
		await expect(receiveUpdate(input)).rejects.toBe(denied);
		expect(mocks.updateAccount).not.toHaveBeenCalled();
	});
});
