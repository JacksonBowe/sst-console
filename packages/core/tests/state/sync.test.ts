import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	send: vi.fn(),
	upsertState: vi.fn(),
	upsertDiscovery: vi.fn(),
	reconcile: vi.fn(),
	requestReconcile: vi.fn()
}));

vi.mock("@aws-sdk/client-s3", async importOriginal => ({
	...(await importOriginal<typeof import("@aws-sdk/client-s3")>()),
	S3Client: class {
		send = mocks.send;
	}
}));
vi.mock("../../src/account/connector", () => ({
	connect: async () => ({
		account: { stateBucket: "bucket", region: "us-east-1" },
		connection: { credentials: {} }
	})
}));
vi.mock("../../src/connection", () => ({
	getSyncPolicy: async () => ({}),
	Policy: { includesStage: () => true }
}));
vi.mock("../../src/state/discovery", () => ({
	upsertEntry: mocks.upsertDiscovery,
	remove: vi.fn()
}));
vi.mock("../../src/state/cleanup", () => ({
	requestProjectionRemoval: vi.fn()
}));
vi.mock("../../src/issue/monitoring", () => ({
	requestReconcile: mocks.requestReconcile
}));
vi.mock("../../src/app/projection", () => ({ reconcile: mocks.reconcile }));
vi.mock("../../src/db", () => ({
	db: { entities: { state: { upsert: mocks.upsertState } } }
}));

const { sync } = await import("../../src/state/sync");
const input = { accountId: "123456789012", appName: "app", stageName: "prod" };

function checkpoint(time?: string) {
	return JSON.stringify({
		version: 3,
		checkpoint: {
			latest: {
				manifest: time === undefined ? {} : { time },
				resources: []
			}
		}
	});
}

describe("current state sync timestamps", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.upsertState.mockReturnValue({ go: async () => ({}) });
		mocks.reconcile.mockImplementation(async ({ projections }) => ({
			conflicts: [],
			projections
		}));
	});

	it("normalizes a checkpoint offset timestamp before writing State", async () => {
		mocks.send.mockResolvedValue({
			Body: {
				transformToByteArray: async () =>
					new TextEncoder().encode(
						checkpoint("2026-10-01T16:21:28.194863112+10:00")
					)
			}
		});
		await expect(sync(input)).resolves.toMatchObject({ status: "synced" });
		expect(mocks.upsertState).toHaveBeenCalledWith(
			expect.objectContaining({ observedAt: "2026-10-01T06:21:28.194Z" })
		);
		expect(mocks.upsertDiscovery).toHaveBeenCalledWith(
			expect.objectContaining({
				lastModified: "2026-10-01T06:21:28.194Z"
			})
		);
	});

	it("rejects an invalid manifest timestamp before writes", async () => {
		mocks.send.mockResolvedValue({
			Body: {
				transformToByteArray: async () =>
					new TextEncoder().encode(checkpoint("not-a-date"))
			}
		});
		await expect(sync(input)).rejects.toThrow(
			"Invalid SST state timestamp"
		);
		expect(mocks.upsertDiscovery).not.toHaveBeenCalled();
		expect(mocks.reconcile).not.toHaveBeenCalled();
	});

	it("accepts UTC manifest timestamps", async () => {
		mocks.send.mockResolvedValue({
			Body: {
				transformToByteArray: async () =>
					new TextEncoder().encode(checkpoint("2026-01-02T03:04:05Z"))
			}
		});
		await sync(input);
		expect(mocks.upsertState).toHaveBeenCalledWith(
			expect.objectContaining({ observedAt: "2026-01-02T03:04:05.000Z" })
		);
	});

	it("uses the current time when manifest time is missing", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-02T03:04:05Z"));
		try {
			mocks.send.mockResolvedValue({
				Body: {
					transformToByteArray: async () =>
						new TextEncoder().encode(checkpoint())
				}
			});
			await sync(input);
			expect(mocks.upsertState).toHaveBeenCalledWith(
				expect.objectContaining({
					observedAt: "2026-01-02T03:04:05.000Z"
				})
			);
		} finally {
			vi.useRealTimers();
		}
	});
});
