import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	listBySource: vi.fn(),
	publish: vi.fn(),
	parseError: vi.fn(),
	recordOccurrence: vi.fn()
}));

vi.mock("sst", () => ({ Resource: { Bus: "bus" } }));
vi.mock("sst/aws/bus", () => ({ bus: { publish: mocks.publish } }));
vi.mock("../../src/issue/monitoring-utils", () => ({
	isIssueWorkerFunction: () => false
}));
vi.mock("../../src/issue/issue", () => ({
	Events: { Created: "issue.created", Recurred: "issue.recurred" },
	recordOccurrence: mocks.recordOccurrence
}));
vi.mock("../../src/issue/issue.subscription", () => ({
	listBySource: mocks.listBySource
}));
vi.mock("../../src/issue/parser", () => ({ parseError: mocks.parseError }));

import { processCandidate } from "../../src/issue/processor";

describe("Issue processor alerts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.publish.mockResolvedValue(undefined);
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

	it("publishes a recurrence after recording a recurring occurrence", async () => {
		const updated = { count: 2 };
		mocks.recordOccurrence.mockResolvedValue({
			outcome: "recurred",
			issue: updated
		});

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

		expect(mocks.recordOccurrence).toHaveBeenCalledWith(
			expect.objectContaining({
				eventId: "event",
				sourceKey: expect.any(String)
			})
		);
		expect(mocks.publish).toHaveBeenCalledWith("bus", "issue.recurred", {
			issue: updated
		});
	});

	it("does not publish an ordinary occurrence update", async () => {
		mocks.recordOccurrence.mockResolvedValue({
			outcome: "updated",
			issue: { count: 2 }
		});

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

		expect(mocks.publish).not.toHaveBeenCalled();
	});

	it("does not publish a duplicate ingress event", async () => {
		mocks.recordOccurrence.mockResolvedValue({ outcome: "duplicate" });

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

		expect(mocks.recordOccurrence).toHaveBeenCalledOnce();
		expect(mocks.publish).not.toHaveBeenCalled();
	});

	it("does not republish when event publication fails after persistence", async () => {
		mocks.recordOccurrence.mockResolvedValue({
			outcome: "created",
			issue: { count: 1 }
		});
		mocks.publish.mockRejectedValue(new Error("EventBridge unavailable"));

		await expect(
			processCandidate({
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
			})
		).rejects.toThrow("EventBridge unavailable");

		mocks.recordOccurrence.mockResolvedValue({ outcome: "duplicate" });
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

		expect(mocks.recordOccurrence).toHaveBeenCalledTimes(2);
		expect(mocks.publish).toHaveBeenCalledOnce();
	});
});
