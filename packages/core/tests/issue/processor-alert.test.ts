import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	find: vi.fn(),
	get: vi.fn(),
	update: vi.fn(),
	listBySource: vi.fn(),
	publish: vi.fn(),
	parseError: vi.fn()
}));

vi.mock("sst", () => ({ Resource: { Bus: "bus" } }));
vi.mock("sst/aws/bus", () => ({ bus: { publish: mocks.publish } }));
vi.mock("../../src/issue/monitoring-utils", () => ({
	isIssueWorkerFunction: () => false
}));
vi.mock("../../src/issue/issue", () => ({
	Events: { Created: "issue.created", Updated: "issue.updated" },
	find: mocks.find,
	get: mocks.get,
	create: vi.fn(),
	update: mocks.update
}));
vi.mock("../../src/issue/issue.subscription", () => ({
	listBySource: mocks.listBySource
}));
vi.mock("../../src/issue/parser", () => ({ parseError: mocks.parseError }));

import { processCandidate } from "../../src/issue/processor";

describe("Issue processor alerts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.listBySource.mockResolvedValue([
			{
				status: "attached",
				appName: "console",
				stageName: "prod",
				functionArn:
					"arn:aws:lambda:ap-southeast-2:123456789012:function:example"
			}
		]);
		mocks.parseError.mockReturnValue({
			errorType: "Error",
			errorMessage: "Failure"
		});
	});

	it("publishes an update after incrementing an existing Issue count", async () => {
		mocks.find.mockResolvedValue({
			status: "open",
			lastSeenAt: "2026-10-13T00:00:00.000Z"
		});
		const updated = { count: 2 };
		mocks.get.mockResolvedValue(updated);

		await processCandidate({
			source: {
				accountId: "123456789012",
				region: "ap-southeast-2",
				logGroup: "/aws/lambda/example",
				logStream: "stream"
			},
			events: [
				{
					id: "event",
					timestamp: 1_760_313_600_000,
					message: "failure"
				}
			]
		});

		expect(mocks.update).toHaveBeenCalledWith(
			expect.objectContaining({ countDelta: 1 })
		);
		expect(mocks.publish).toHaveBeenCalledWith("bus", "issue.updated", {
			issue: updated
		});
	});
});
