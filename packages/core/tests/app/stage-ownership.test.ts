import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ get: vi.fn(), go: vi.fn() }));
vi.mock("../../src/db", () => ({
	db: { entities: { stage: { get: mocks.get } } }
}));

const { assertStageOwnership } = await import("../../src/app/app.stage");
const input = { accountId: "123456789012", appName: "app", stageName: "prod" };
const stage = {
	...input,
	region: "us-east-1",
	issueMonitoringEnabled: false,
	createdAt: "2026-01-01T00:00:00Z",
	updatedAt: "2026-01-01T00:00:00Z"
};

describe("Stage ownership", () => {
	it("checks ownership using a consistent Stage read", async () => {
		mocks.get.mockReturnValue({ go: mocks.go });
		mocks.go.mockResolvedValue({ data: stage });
		await expect(assertStageOwnership(input)).resolves.toBeUndefined();
		expect(mocks.get).toHaveBeenCalledWith({
			appName: "app",
			stageName: "prod"
		});
		expect(mocks.go).toHaveBeenCalledWith({ consistent: true });
	});

	it.each([null, { ...stage, accountId: "999999999999" }])(
		"rejects missing or differently owned Stages",
		async data => {
			mocks.get.mockReturnValue({ go: mocks.go });
			mocks.go.mockResolvedValue({ data });
			await expect(assertStageOwnership(input)).rejects.toMatchObject({
				code: "app.stage_not_found"
			});
		}
	);
});
