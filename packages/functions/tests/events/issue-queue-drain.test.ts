import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	send: vi.fn(),
	processCandidate: vi.fn(),
	reconcileStage: vi.fn(),
	withActor: vi.fn((_actor, fn: () => unknown) => fn()),
	ingressQueueUrl: "https://sqs.example.com/ingress",
	reconcileQueueUrl: "https://sqs.example.com/reconcile"
}));

vi.mock("@aws-sdk/client-sqs", () => ({
	SQSClient: class {
		send = mocks.send;
	},
	ReceiveMessageCommand: class {
		constructor(readonly input: unknown) {}
	},
	DeleteMessageBatchCommand: class {
		constructor(readonly input: unknown) {}
	}
}));
vi.mock("@console/core/actor", () => ({ withActor: mocks.withActor }));
vi.mock("@console/core/issue", () => ({
	Monitoring: { reconcileStage: mocks.reconcileStage }
}));
vi.mock("@console/core/issue/processor", () => ({
	processCandidate: mocks.processCandidate
}));
vi.mock("sst", () => ({
	Resource: {
		IssueIngressQueue: { url: mocks.ingressQueueUrl },
		IssueReconcileQueue: { url: mocks.reconcileQueueUrl }
	}
}));

import { handler } from "../../src/events/issue-queue-drain";

const { ingressQueueUrl, reconcileQueueUrl } = mocks;

const candidate = {
	source: {
		accountId: "123456789012",
		region: "ap-southeast-2",
		logGroup: "/aws/lambda/example",
		logStream: "stream"
	},
	events: [{ id: "event", timestamp: 1, message: "Error: failure" }]
};

const reconciliation = {
	appName: "console",
	stageName: "dev",
	action: "reconcile",
	attempt: 0
};

function commandInput(command: { input: unknown }) {
	return command.input as {
		QueueUrl: string;
		Entries?: Array<{ Id: string; ReceiptHandle: string }>;
	};
}

describe("Issue queue drain", () => {
	beforeEach(() => {
		mocks.send.mockReset();
		mocks.processCandidate.mockReset();
		mocks.reconcileStage.mockReset();
		mocks.withActor.mockClear();
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	afterEach(() => vi.restoreAllMocks());

	it("receives once from each empty queue", async () => {
		mocks.send.mockResolvedValue({ Messages: [] });

		await handler();

		expect(mocks.send).toHaveBeenCalledTimes(2);
		expect(
			mocks.send.mock.calls.map(([command]) => commandInput(command))
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ QueueUrl: ingressQueueUrl }),
				expect.objectContaining({ QueueUrl: reconcileQueueUrl })
			])
		);
	});

	it("processes and deletes valid ingress messages as system actor", async () => {
		mocks.send.mockImplementation((command: { input: unknown }) => {
			const input = commandInput(command);
			if (input.Entries) return Promise.resolve({});
			if (input.QueueUrl === ingressQueueUrl)
				return Promise.resolve({
					Messages: [
						{
							Body: JSON.stringify(candidate),
							ReceiptHandle: "ingress-receipt"
						}
					]
				});
			return Promise.resolve({ Messages: [] });
		});

		await handler();

		expect(mocks.withActor).toHaveBeenCalledWith(
			{ type: "system", properties: {} },
			expect.any(Function)
		);
		expect(mocks.processCandidate).toHaveBeenCalledWith(candidate);
		expect(
			mocks.send.mock.calls
				.map(([command]) => commandInput(command))
				.find(input => input.Entries)
		).toMatchObject({
			QueueUrl: ingressQueueUrl,
			Entries: [{ Id: "0", ReceiptHandle: "ingress-receipt" }]
		});
	});

	it("processes and deletes valid reconciliation messages", async () => {
		mocks.send.mockImplementation((command: { input: unknown }) => {
			const input = commandInput(command);
			if (input.Entries) return Promise.resolve({});
			if (input.QueueUrl === reconcileQueueUrl)
				return Promise.resolve({
					Messages: [
						{
							Body: JSON.stringify(reconciliation),
							ReceiptHandle: "reconcile-receipt"
						}
					]
				});
			return Promise.resolve({ Messages: [] });
		});

		await handler();

		expect(mocks.reconcileStage).toHaveBeenCalledWith(reconciliation);
	});

	it("deletes successful messages while retaining failed siblings", async () => {
		mocks.send.mockImplementation((command: { input: unknown }) => {
			const input = commandInput(command);
			if (input.Entries) return Promise.resolve({});
			if (input.QueueUrl === ingressQueueUrl)
				return Promise.resolve({
					Messages: [
						{
							Body: JSON.stringify(candidate),
							ReceiptHandle: "success"
						},
						{ Body: "{}", ReceiptHandle: "failure" }
					]
				});
			return Promise.resolve({ Messages: [] });
		});

		await handler();

		expect(
			mocks.send.mock.calls
				.map(([command]) => commandInput(command))
				.find(input => input.Entries)
		).toMatchObject({ Entries: [{ Id: "0", ReceiptHandle: "success" }] });
	});

	it("logs partial batch-delete failures", async () => {
		mocks.send.mockImplementation((command: { input: unknown }) => {
			const input = commandInput(command);
			if (input.Entries)
				return Promise.resolve({ Failed: [{ Id: "0" }] });
			if (input.QueueUrl === ingressQueueUrl)
				return Promise.resolve({
					Messages: [
						{
							Body: JSON.stringify(candidate),
							ReceiptHandle: "ingress-receipt"
						}
					]
				});
			return Promise.resolve({ Messages: [] });
		});

		await handler();

		expect(console.error).toHaveBeenCalledWith(
			"Issue queue message delete failed",
			{
				queueUrl: ingressQueueUrl,
				failure: { Id: "0" }
			}
		);
	});

	it("receives another batch after a full batch", async () => {
		const messages = Array.from({ length: 10 }, (_, index) => ({
			Body: JSON.stringify(candidate),
			ReceiptHandle: String(index)
		}));
		let ingressReceives = 0;
		mocks.send.mockImplementation((command: { input: unknown }) => {
			const input = commandInput(command);
			if (input.Entries) return Promise.resolve({});
			if (input.QueueUrl === ingressQueueUrl)
				return Promise.resolve({
					Messages: ingressReceives++ === 0 ? messages : []
				});
			return Promise.resolve({ Messages: [] });
		});

		await handler();

		expect(ingressReceives).toBe(2);
	});

	it("stops before receiving when the time limit is reached", async () => {
		const now = vi.spyOn(Date, "now");
		now.mockReturnValueOnce(0)
			.mockReturnValueOnce(45_000)
			.mockReturnValueOnce(0)
			.mockReturnValue(45_000);

		await handler();

		expect(mocks.send).not.toHaveBeenCalled();
	});

	it("stops after ten full batches", async () => {
		const messages = Array.from({ length: 10 }, (_, index) => ({
			Body: JSON.stringify(candidate),
			ReceiptHandle: String(index)
		}));
		let ingressReceives = 0;
		mocks.send.mockImplementation((command: { input: unknown }) => {
			const input = commandInput(command);
			if (input.Entries) return Promise.resolve({});
			if (input.QueueUrl === ingressQueueUrl) {
				ingressReceives++;
				return Promise.resolve({ Messages: messages });
			}
			return Promise.resolve({ Messages: [] });
		});

		await handler();

		expect(ingressReceives).toBe(10);
		expect(console.warn).toHaveBeenCalledWith(
			"Issue queue drain reached batch limit",
			{ queueUrl: ingressQueueUrl }
		);
	});

	it("continues draining one queue when the other receive fails", async () => {
		mocks.send.mockImplementation((command: { input: unknown }) => {
			const input = commandInput(command);
			if (input.QueueUrl === ingressQueueUrl)
				return Promise.reject(new Error("ingress unavailable"));
			return Promise.resolve({ Messages: [] });
		});

		await handler();

		expect(
			mocks.send.mock.calls.map(([command]) => commandInput(command))
		).toContainEqual(
			expect.objectContaining({ QueueUrl: reconcileQueueUrl })
		);
	});
});
