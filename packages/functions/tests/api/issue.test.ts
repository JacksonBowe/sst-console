import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const mocks = vi.hoisted(() => ({
	disableAllStages: vi.fn()
}));

vi.mock("@console/core/app", () => ({
	StageKeySchema: z.object({
		appName: z.string().min(1),
		stageName: z.string().min(1)
	})
}));

vi.mock("@console/core/issue", () => ({
	IssueStatusSchema: z.enum(["open", "resolved", "suppressed"]),
	Monitoring: { disableAllStages: mocks.disableAllStages }
}));

import { issueRoutes } from "../../src/api/issue";

afterEach(() => {
	vi.clearAllMocks();
});

describe("Issue monitoring API", () => {
	it("disables monitoring on every monitored Stage", async () => {
		mocks.disableAllStages.mockResolvedValue({ disabled: 3 });

		const app = new Hono().route("/issues", issueRoutes);
		const response = await app.request("/issues/monitoring/disable", {
			method: "POST"
		});

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ disabled: 3 });
		expect(mocks.disableAllStages).toHaveBeenCalledOnce();
	});
});
