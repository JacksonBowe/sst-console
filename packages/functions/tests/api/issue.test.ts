import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const mocks = vi.hoisted(() => ({
	accountList: vi.fn(),
	appList: vi.fn(),
	appSummary: vi.fn(),
	issueCreate: vi.fn(),
	disableAllStages: vi.fn()
}));

vi.mock("@console/core/account", () => ({
	list: mocks.accountList
}));

vi.mock("@console/core/app", () => ({
	StageKeySchema: z.object({
		appName: z.string().min(1),
		stageName: z.string().min(1)
	}),
	list: mocks.appList,
	summary: mocks.appSummary
}));

vi.mock("@console/core/issue", () => ({
	IssueStatusSchema: z.enum(["open", "resolved", "suppressed"]),
	create: mocks.issueCreate,
	Monitoring: { disableAllStages: mocks.disableAllStages }
}));

import { issueRoutes } from "../../src/api/issue";

afterEach(() => {
	vi.clearAllMocks();
});

describe("issue seed API", () => {
	it("creates Issues across connected Stages", async () => {
		mocks.accountList.mockResolvedValue([
			{ accountId: "123456789012", status: "connected" },
			{ accountId: "210987654321", status: "disconnected" }
		]);
		mocks.appList.mockResolvedValue([
			{ appName: "connected-app" },
			{ appName: "disconnected-app" }
		]);
		mocks.appSummary.mockImplementation(({ appName }) => ({
			appName,
			stages: [
				{
					appName,
					stageName: "dev",
					accountId:
						appName === "connected-app"
							? "123456789012"
							: "210987654321",
					region: "ap-southeast-2"
				}
			]
		}));

		const app = new Hono().route("/issues", issueRoutes);
		const response = await app.request("/issues/test-seed", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ count: 3 })
		});
		const body = (await response.json()) as { issues: unknown[] };

		expect(response.status).toBe(200);
		expect(body.issues).toHaveLength(3);
		expect(mocks.issueCreate).toHaveBeenCalledTimes(3);
		for (const issue of body.issues)
			expect(issue).toMatchObject({
				appName: "connected-app",
				stageName: "dev",
				accountId: "123456789012"
			});
	});

	it("rejects seeding when no connected Stage exists", async () => {
		mocks.accountList.mockResolvedValue([
			{ accountId: "123456789012", status: "disconnected" }
		]);
		mocks.appList.mockResolvedValue([{ appName: "disconnected-app" }]);
		mocks.appSummary.mockResolvedValue({
			stages: [
				{
					appName: "disconnected-app",
					stageName: "dev",
					accountId: "123456789012",
					region: "ap-southeast-2"
				}
			]
		});

		const app = new Hono().route("/issues", issueRoutes);
		const response = await app.request("/issues/test-seed", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: "{}"
		});

		expect(response.status).toBe(400);
		expect(mocks.issueCreate).not.toHaveBeenCalled();
	});
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
