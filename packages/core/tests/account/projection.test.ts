import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	queryStagesByAwsAccount,
	queryDiscoveredStages,
	queryResources,
	queryStagesByApp,
	deleteApp,
	deleteResource,
	deleteStage,
	deleteDiscoveredStage,
	transactionWrite,
	removeStageHistory
} = vi.hoisted(() => ({
	queryStagesByAwsAccount: vi.fn(),
	queryDiscoveredStages: vi.fn(),
	queryResources: vi.fn(),
	queryStagesByApp: vi.fn(),
	deleteApp: vi.fn(),
	deleteResource: vi.fn(),
	deleteStage: vi.fn(),
	deleteDiscoveredStage: vi.fn(),
	transactionWrite: vi.fn(),
	removeStageHistory: vi.fn()
}));

vi.mock("../../src/db", () => ({
	db: {
		entities: {
			stage: {
				query: {
					byAwsAccount: queryStagesByAwsAccount,
					stage: queryStagesByApp
				},
				delete: deleteStage
			},
			resource: {
				query: { resource: queryResources },
				delete: deleteResource
			},
			discoveredStage: {
				query: { discovery: queryDiscoveredStages },
				delete: deleteDiscoveredStage
			},
			app: { delete: deleteApp }
		},
		transaction: { write: transactionWrite }
	}
}));

vi.mock("../../src/state/state", () => ({
	removeStageHistory
}));
vi.mock("../../src/account/connector", () => ({ connect: vi.fn() }));
vi.mock("../../src/connection", () => ({}));
vi.mock("../../src/state/update", () => ({}));
vi.mock("../../src/state/snapshot", () => ({}));
vi.mock("../../src/state/event-log", () => ({}));
vi.mock("../../src/issue/monitoring", () => ({
	removeStageMonitoring: vi.fn()
}));

const { removeAccountProjections } =
	await import("../../src/account/projection");

describe("account projection removal", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		removeStageHistory.mockResolvedValue(undefined);
		queryStagesByAwsAccount.mockReturnValue({
			go: vi.fn().mockResolvedValue({
				data: [
					{ appName: "removed", stageName: "dev" },
					{ appName: "shared", stageName: "prod" }
				]
			})
		});
		queryDiscoveredStages.mockReturnValue({
			go: vi.fn().mockResolvedValue({
				data: [
					{
						accountId: "111111111111",
						appName: "removed",
						stageName: "dev"
					}
				]
			})
		});
		queryResources.mockReturnValue({
			go: vi.fn().mockResolvedValue({
				data: [
					{
						appName: "removed",
						stageName: "dev",
						resourceId: "bucket"
					}
				]
			})
		});
		queryStagesByApp.mockImplementation(({ appName }) => ({
			go: vi.fn().mockResolvedValue({
				data:
					appName === "shared"
						? [
								{
									appName,
									stageName: "other",
									accountId: "111111111111",
									region: "us-east-1",
									issueMonitoringEnabled: false,
									createdAt: "2026-01-01T00:00:00.000Z",
									updatedAt: "2026-01-01T00:00:00.000Z"
								}
							]
						: []
			})
		}));
		for (const operation of [
			deleteResource,
			deleteStage,
			deleteDiscoveredStage
		])
			operation.mockReturnValue({ commit: vi.fn().mockReturnValue({}) });
		deleteApp.mockReturnValue({ go: vi.fn().mockResolvedValue(undefined) });
		transactionWrite.mockImplementation(callback => {
			callback({
				resource: { delete: deleteResource },
				stage: { delete: deleteStage },
				discoveredStage: { delete: deleteDiscoveredStage }
			});
			return { go: vi.fn().mockResolvedValue({ canceled: false }) };
		});
	});

	it("removes account-owned projections and orphaned apps", async () => {
		await removeAccountProjections("111111111111");

		expect(deleteResource).toHaveBeenCalledWith({
			appName: "removed",
			stageName: "dev",
			resourceId: "bucket"
		});
		expect(deleteStage).toHaveBeenCalledWith({
			appName: "removed",
			stageName: "dev"
		});
		expect(deleteDiscoveredStage).toHaveBeenCalledWith({
			accountId: "111111111111",
			appName: "removed",
			stageName: "dev"
		});
		expect(deleteApp).toHaveBeenCalledWith({ appName: "removed" });
		expect(deleteApp).not.toHaveBeenCalledWith({ appName: "shared" });
	});

	it("keeps Stages when history cleanup fails", async () => {
		removeStageHistory.mockRejectedValue(new Error("cleanup failed"));
		await expect(removeAccountProjections("111111111111")).rejects.toThrow(
			"cleanup failed"
		);
		expect(deleteStage).not.toHaveBeenCalled();
	});
});
