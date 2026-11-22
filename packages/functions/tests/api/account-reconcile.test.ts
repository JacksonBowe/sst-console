import { InvokeCommand } from "@aws-sdk/client-lambda";
import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("@aws-sdk/client-lambda", async importOriginal => {
	const original =
		await importOriginal<typeof import("@aws-sdk/client-lambda")>();
	return {
		...original,
		LambdaClient: class {
			send = send;
		}
	};
});
vi.mock("@console/core/account", () => ({}));
vi.mock("@console/core/state", () => ({}));
vi.mock("@console/core/app", () => ({ Stage: {} }));
vi.mock("@console/core/connection", () => ({
	AccountSyncPolicySchema: z.object({})
}));
vi.mock("sst", () => ({
	Resource: { ConnectorReconciler: { name: "reconciler" } }
}));

const { accountRoutes } = await import("../../src/api/account");

describe("manual connector reconciliation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubEnv("SST_CONSOLE_CONNECTOR_FINGERPRINT", "fingerprint");
		vi.stubEnv(
			"SST_CONSOLE_CONNECTOR_TEMPLATE_URL",
			"https://example.com/template.json"
		);
		send.mockResolvedValue({});
	});

	afterEach(() => vi.unstubAllEnvs());

	it("invokes the reconciler asynchronously with the current template", async () => {
		const response = await new Hono()
			.route("/accounts", accountRoutes)
			.request("/accounts/reconcile-connectors", { method: "POST" });

		expect(response.status).toBe(202);
		expect(await response.json()).toEqual({
			status: "reconciliation_requested"
		});
		const command = send.mock.calls[0]?.[0];
		expect(command).toBeInstanceOf(InvokeCommand);
		expect(command.input).toMatchObject({
			FunctionName: "reconciler",
			InvocationType: "Event"
		});
		expect(
			JSON.parse(new TextDecoder().decode(command.input.Payload))
		).toEqual({
			fingerprint: "fingerprint",
			templateUrl: "https://example.com/template.json"
		});
	});

	it("rejects requests when configuration is missing", async () => {
		vi.stubEnv("SST_CONSOLE_CONNECTOR_FINGERPRINT", "");
		const response = await new Hono()
			.route("/accounts", accountRoutes)
			.request("/accounts/reconcile-connectors", { method: "POST" });

		expect(response.status).toBe(500);
		expect(send).not.toHaveBeenCalled();
	});
});
