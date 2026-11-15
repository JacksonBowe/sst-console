import { beforeEach, describe, expect, it, vi } from "vitest";

const { query, write } = vi.hoisted(() => ({ query: vi.fn(), write: vi.fn() }));
vi.mock("../../src/db", () => ({
	db: {
		entities: { resource: { query: { resource: query } } },
		transaction: { write }
	}
}));

const { remove } = await import("../../src/app/resource");

describe("App Resource cleanup", () => {
	beforeEach(() => vi.clearAllMocks());

	it("reports the standard App error when deletion is canceled", async () => {
		query.mockReturnValue({
			go: async () => ({
				data: [
					{ appName: "shop", stageName: "prod", resourceId: "bucket" }
				]
			})
		});
		write.mockReturnValue({ go: async () => ({ canceled: true }) });
		await expect(
			remove({ appName: "shop", stageName: "prod" })
		).rejects.toMatchObject({ code: "stage_resource_removal_failed" });
	});

	it("removes Resources for multiple Stages in bounded batches", async () => {
		const stages = [
			{ appName: "shop", stageName: "dev" },
			{ appName: "shop", stageName: "prod" }
		];
		query.mockImplementation(stage => ({
			go: async () => ({
				data: Array.from(
					{ length: stage.stageName === "dev" ? 90 : 1 },
					(_, index) => ({
						...stage,
						resourceId: `resource-${index}`
					})
				)
			})
		}));
		write.mockReturnValue({ go: async () => ({ canceled: false }) });
		await remove(stages);
		expect(query).toHaveBeenCalledTimes(2);
		expect(query).toHaveBeenNthCalledWith(1, stages[0]);
		expect(query).toHaveBeenNthCalledWith(2, stages[1]);
		expect(write).toHaveBeenCalledTimes(2);
	});

	it("does not query or write for an empty array", async () => {
		await remove([]);
		expect(query).not.toHaveBeenCalled();
		expect(write).not.toHaveBeenCalled();
	});

	it("preserves the account cleanup error for an array", async () => {
		query.mockReturnValue({
			go: async () => ({
				data: [
					{ appName: "shop", stageName: "prod", resourceId: "bucket" }
				]
			})
		});
		write.mockReturnValue({ go: async () => ({ canceled: true }) });
		await expect(
			remove([{ appName: "shop", stageName: "prod" }])
		).rejects.toMatchObject({ code: "state.projection_removal_failed" });
	});
});
