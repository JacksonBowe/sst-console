import { gzipSync } from "node:zlib";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	find: vi.fn(),
	assume: vi.fn(),
	policy: vi.fn(),
	includes: vi.fn(),
	stageGet: vi.fn(),
	send: vi.fn(),
	parse: vi.fn(),
	upsert: vi.fn(),
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
vi.mock("../../src/account/account", () => ({ find: mocks.find }));
vi.mock("../../src/account/connector", () => ({ assume: mocks.assume }));
vi.mock("../../src/connection", () => ({
	getSyncPolicy: mocks.policy,
	Policy: { includesStage: mocks.includes }
}));
vi.mock("../../src/state", () => ({
	Update: {
		parseObjectKey: () => ({
			appName: "app",
			stageName: "dev",
			updateId: "id"
		}),
		parseSstUpdate: mocks.parse,
		upsert: mocks.upsert
	}
}));
vi.mock("../../src/db", () => ({
	db: {
		entities: { stage: { get: mocks.stageGet } },
		transaction: { write: mocks.write }
	}
}));
vi.mock("../../src/issue/monitoring", () => ({}));

const { syncStateUpdateObject } = await import("../../src/account/sync");
const input = {
	accountId: "123456789012",
	stateBucket: "bucket",
	stateKey: "update/app/dev/id.json",
	sequencer: "0".repeat(255) + "1"
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
		mocks.assume.mockResolvedValue({ credentials: {} });
		mocks.send.mockResolvedValue({
			ContentEncoding: "gzip",
			Body: { transformToByteArray: async () => gzipSync('{"id":"id"}') }
		});
		mocks.parse.mockReturnValue({
			updateId: "id",
			sstVersion: "4",
			command: "deploy",
			timeStarted: "2026-01-01T00:00:00Z",
			errors: []
		});
		mocks.upsert.mockResolvedValue(true);
		mocks.write.mockReturnValue({
			go: vi.fn().mockResolvedValue({ canceled: false })
		});
	});

	it("creates a Stage and ingests a compressed update before current State exists", async () => {
		await expect(syncStateUpdateObject(input)).resolves.toMatchObject({
			status: "synced"
		});
		expect(mocks.parse).toHaveBeenCalledWith('{"id":"id"}');
		expect(mocks.write).toHaveBeenCalledOnce();
		expect(mocks.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				appName: "app",
				stageName: "dev",
				updateId: "id"
			})
		);
	});

	it("ignores a Stage owned by another account", async () => {
		mocks.stageGet.mockReturnValue({
			go: vi
				.fn()
				.mockResolvedValue({ data: { accountId: "999999999999" } })
		});
		await expect(syncStateUpdateObject(input)).resolves.toMatchObject({
			status: "ignored"
		});
		expect(mocks.assume).not.toHaveBeenCalled();
	});

	it("ignores excluded Stages and incorrect buckets", async () => {
		mocks.includes.mockReturnValue(false);
		await expect(syncStateUpdateObject(input)).resolves.toMatchObject({
			status: "ignored"
		});
		await expect(
			syncStateUpdateObject({ ...input, stateBucket: "wrong" })
		).resolves.toMatchObject({ status: "ignored" });
		expect(mocks.assume).not.toHaveBeenCalled();
	});
});
