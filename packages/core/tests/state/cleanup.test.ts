import { beforeEach, describe, expect, it, vi } from "vitest";

const { listByAccount, publish } = vi.hoisted(() => ({
	listByAccount: vi.fn(),
	publish: vi.fn()
}));

vi.mock("sst", () => ({ Resource: { Bus: { name: "bus" } } }));
vi.mock("sst/aws/bus", () => ({ bus: { publish } }));
vi.mock("../../src/app/app.stage", () => ({ listByAccount }));

const { cleanupStale } = await import("../../src/state/cleanup");

describe("stale Stage cleanup", () => {
	beforeEach(() => vi.clearAllMocks());

	it("schedules only account Stages absent from the selected inventory", async () => {
		listByAccount.mockResolvedValue([
			{ appName: "shop", stageName: "prod" },
			{ appName: "shop", stageName: "dev" }
		]);
		await cleanupStale({
			accountId: "123456789012",
			stages: [{ appName: "shop", stageName: "prod" }]
		});
		expect(publish).toHaveBeenCalledOnce();
		expect(publish).toHaveBeenCalledWith(
			{ name: "bus" },
			expect.objectContaining({
				type: "app.stage.projection_removal_requested"
			}),
			{ accountId: "123456789012", appName: "shop", stageName: "dev" }
		);
	});
});
