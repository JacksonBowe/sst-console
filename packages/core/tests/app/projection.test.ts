import { describe, expect, it, vi } from "vitest";

const { stageGet, resourceQuery, transactionWrite } = vi.hoisted(() => ({
	stageGet: vi.fn(),
	resourceQuery: vi.fn(),
	transactionWrite: vi.fn()
}));
vi.mock("../../src/db", () => ({
	db: {
		entities: {
			stage: { get: stageGet },
			resource: { query: { resource: resourceQuery } }
		},
		transaction: { write: transactionWrite }
	}
}));

const { buildWrites, reconcile } = await import("../../src/app/projection");
const observation = {
	appName: "shop",
	stageName: "prod",
	key: "app/shop/prod.json",
	sourceUpdatedAt: "2026-01-01T00:00:00.000Z",
	resources: []
};
const input = {
	accountId: "123456789012",
	region: "us-east-1",
	projections: [observation],
	now: "2026-01-01T00:00:00.000Z"
};

describe("App projection reconciliation", () => {
	it("removes Resources absent from a complete observation", async () => {
		stageGet.mockReturnValue({
			go: async () => ({ data: { accountId: input.accountId } })
		});
		resourceQuery.mockReturnValue({
			go: async () => ({
				data: [
					{ appName: "shop", stageName: "prod", resourceId: "old" }
				]
			})
		});
		const result = await buildWrites(input);
		expect(result.writes).toContainEqual({
			kind: "deleteResource",
			appName: "shop",
			stageName: "prod",
			resourceId: "old"
		});
	});
	it("does not reconcile a Stage owned by another account", async () => {
		stageGet.mockReturnValue({
			go: async () => ({ data: { accountId: "999999999999" } })
		});
		const result = await buildWrites(input);
		expect(result.writes).toEqual([]);
		expect(result.conflicts).toEqual([
			{
				appName: "shop",
				stageName: "prod",
				ownerAccountId: "999999999999"
			}
		]);
	});

	it("rejects an invalid observation before writing", () => {
		expect(() =>
			reconcile({
				...input,
				projections: [{ ...observation, stageName: "" }]
			})
		).toThrow();
	});

	it("reconciles a complete observation through bounded transactions", async () => {
		stageGet.mockReturnValue({
			go: async () => ({ data: { accountId: input.accountId } })
		});
		resourceQuery.mockReturnValue({ go: async () => ({ data: [] }) });
		transactionWrite.mockReturnValue({
			go: async () => ({ canceled: false })
		});
		const result = await reconcile(input);
		expect(result.conflicts).toEqual([]);
		expect(result.projections).toHaveLength(1);
		expect(transactionWrite).toHaveBeenCalled();
	});
});
