import { beforeEach, describe, expect, it, vi } from "vitest";

const { remove, go, write, transactionGo, commit } = vi.hoisted(() => ({
	remove: vi.fn(),
	go: vi.fn(),
	write: vi.fn(),
	transactionGo: vi.fn(),
	commit: vi.fn()
}));
vi.mock("../../src/db", () => ({
	db: {
		entities: { stage: { delete: remove } },
		transaction: { write }
	}
}));

const Stage = await import("../../src/app/app.stage");
const key = { appName: "shop", stageName: "prod" };

describe("Stage.remove", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		remove.mockReturnValue({ go, commit });
		write.mockImplementation(callback => {
			callback({ stage: { delete: remove } });
			return { go: transactionGo };
		});
		transactionGo.mockResolvedValue({ canceled: false });
	});

	it("deletes a single Stage directly", async () => {
		await Stage.remove(key);
		expect(remove).toHaveBeenCalledWith(key);
		expect(go).toHaveBeenCalledWith({ response: "none" });
		expect(write).not.toHaveBeenCalled();
	});

	it("deletes arrays in bounded transactions", async () => {
		const stages = Array.from({ length: 91 }, (_, index) => ({
			...key,
			stageName: `stage-${index}`
		}));
		await Stage.remove(stages);
		expect(write).toHaveBeenCalledTimes(2);
		expect(remove).toHaveBeenCalledTimes(91);
		expect(commit).toHaveBeenCalledTimes(91);
	});

	it("reports canceled batch deletion", async () => {
		transactionGo.mockResolvedValue({ canceled: true });
		await expect(Stage.remove([key])).rejects.toMatchObject({
			code: "state.projection_removal_failed"
		});
	});

	it("does not write for an empty array", async () => {
		await Stage.remove([]);
		expect(write).not.toHaveBeenCalled();
	});
});
