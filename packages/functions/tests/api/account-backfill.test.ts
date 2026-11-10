import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

const { backfill } = vi.hoisted(() => ({ backfill: vi.fn() }));
vi.mock("@console/core/state", () => ({ backfill }));
vi.mock("@console/core/account", () => ({}));
vi.mock("@console/core/app", () => ({ Stage: {} }));
vi.mock("@console/core/connection", () => ({
	AccountSyncPolicySchema: z.object({})
}));

const { accountRoutes } = await import("../../src/api/account");

describe("Stage backfill API", () => {
	it("runs manual history replay for the requested Stage", async () => {
		backfill.mockResolvedValue({
			processed: 2,
			skipped: 0,
			failed: 0,
			failures: [],
			failuresTruncated: false
		});
		const app = new Hono().route("/accounts", accountRoutes);
		const response = await app.request(
			"/accounts/123456789012/state/app/prod/backfill",
			{ method: "POST" }
		);
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({
			processed: 2,
			failed: 0
		});
		expect(backfill).toHaveBeenCalledWith({
			accountId: "123456789012",
			appName: "app",
			stageName: "prod"
		});
	});

	it("does not expose the old account-wide route", async () => {
		const app = new Hono().route("/accounts", accountRoutes);
		const response = await app.request(
			"/accounts/123456789012/state/backfill",
			{ method: "POST" }
		);
		expect(response.status).toBe(404);
	});
});
