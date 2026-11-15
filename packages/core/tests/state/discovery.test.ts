import { beforeEach, describe, expect, it, vi } from "vitest";

const { remove, go, commit, write, transactionGo } = vi.hoisted(() => ({
	remove: vi.fn(),
	go: vi.fn(),
	commit: vi.fn(),
	write: vi.fn(),
	transactionGo: vi.fn()
}));

vi.mock("../../src/db", () => ({
	db: {
		entities: { discoveredStage: { delete: remove } },
		transaction: { write }
	}
}));
vi.mock("../../src/account/connector", () => ({ connect: vi.fn() }));
vi.mock("../../src/connection", () => ({}));
vi.mock("../../src/state/update", () => ({}));
vi.mock("../../src/state/snapshot", () => ({}));
vi.mock("../../src/state/event-log", () => ({}));

const Discovery = await import("../../src/state/discovery");
const key = { accountId: "123456789012", appName: "shop", stageName: "prod" };

describe("discovery removal", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		remove.mockReturnValue({ go, commit });
		write.mockImplementation(callback => {
			callback({ discoveredStage: { delete: remove } });
			return { go: transactionGo };
		});
		transactionGo.mockResolvedValue({ canceled: false });
	});

	it("deletes a single entry directly", async () => {
		await Discovery.remove(key);
		expect(remove).toHaveBeenCalledWith(key);
		expect(go).toHaveBeenCalledWith({ response: "none" });
		expect(write).not.toHaveBeenCalled();
	});

	it("deletes arrays in batches of 90", async () => {
		await Discovery.remove(
			Array.from({ length: 91 }, (_, index) => ({
				...key,
				stageName: `stage-${index}`
			}))
		);
		expect(write).toHaveBeenCalledTimes(2);
		expect(commit).toHaveBeenCalledTimes(91);
	});

	it("reports canceled transactions and skips empty arrays", async () => {
		await Discovery.remove([]);
		expect(write).not.toHaveBeenCalled();
		transactionGo.mockResolvedValue({ canceled: true });
		await expect(Discovery.remove([key])).rejects.toMatchObject({
			code: "state.projection_removal_failed"
		});
	});
});
