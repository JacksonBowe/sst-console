import { gzipSync } from "node:zlib";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	find: vi.fn(),
	updateAccount: vi.fn(),
	assume: vi.fn(),
	policy: vi.fn(),
	includes: vi.fn(),
	stageGet: vi.fn(),
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
		entities: { stage: { get: mocks.stageGet } },
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
			go: vi
				.fn()
				.mockResolvedValue({ data: { accountId: "999999999999" } })
		});
		await expect(receiveUpdate(input)).resolves.toMatchObject({
			status: "ignored"
		});
		expect(mocks.send).not.toHaveBeenCalled();
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
