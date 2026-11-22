import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	DescribeStacksCommand,
	UpdateStackCommand
} from "@aws-sdk/client-cloudformation";

const { list, connect, send } = vi.hoisted(() => ({
	list: vi.fn(),
	connect: vi.fn(),
	send: vi.fn()
}));

vi.mock("@console/core/account", () => ({
	list,
	Connector: { connect }
}));
vi.mock("@aws-sdk/client-cloudformation", async importOriginal => {
	const original =
		await importOriginal<typeof import("@aws-sdk/client-cloudformation")>();
	return {
		...original,
		CloudFormationClient: class {
			send = send;
		}
	};
});

const { handler } = await import("../../src/events/connector-reconcile");

describe("connector reconciliation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.SST_CONSOLE_CONNECTOR_STACK_NAME = "connector-stack";
		list.mockResolvedValue([
			{ accountId: "111111111111", status: "connected" },
			{ accountId: "222222222222", status: "connected" },
			{ accountId: "333333333333", status: "disconnected" }
		]);
		connect.mockImplementation(async accountId => ({
			connection: { region: accountId, credentials: {} }
		}));
	});

	it("updates outdated connectors and skips matching and disconnected accounts", async () => {
		send.mockImplementation(async command => {
			if (command instanceof DescribeStacksCommand) {
				const matching =
					send.mock.calls.filter(
						([call]) => call instanceof DescribeStacksCommand
					).length === 2;
				return {
					Stacks: [
						{
							Parameters: [{ ParameterKey: "ExternalId" }],
							Outputs: matching
								? [
										{
											OutputKey:
												"ConnectorTemplateFingerprint",
											OutputValue: "hash"
										}
									]
								: []
						}
					]
				};
			}
			return {};
		});
		await expect(
			handler({ fingerprint: "hash", templateUrl: "https://example.com" })
		).resolves.toEqual({ checked: 2 });
		expect(connect).toHaveBeenCalledTimes(2);
		const updates = send.mock.calls.filter(
			([command]) => command instanceof UpdateStackCommand
		);
		expect(updates).toHaveLength(1);
		expect(updates[0]?.[0].input).toEqual({
			StackName: "connector-stack",
			TemplateURL: "https://example.com",
			Capabilities: ["CAPABILITY_NAMED_IAM"],
			Parameters: [{ ParameterKey: "ExternalId", UsePreviousValue: true }]
		});
	});

	it("reports failed accounts while continuing other requests", async () => {
		connect.mockRejectedValueOnce(new Error("access denied"));
		send.mockResolvedValue({ Stacks: [{ Parameters: [], Outputs: [] }] });
		await expect(
			handler({ fingerprint: "hash", templateUrl: "https://example.com" })
		).rejects.toThrow("111111111111");
		expect(connect).toHaveBeenCalledTimes(2);
		expect(
			send.mock.calls.some(
				([command]) => command instanceof UpdateStackCommand
			)
		).toBe(true);
	});
});
