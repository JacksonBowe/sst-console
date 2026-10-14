import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	processCandidate: vi.fn(),
	withActor: vi.fn((_actor, fn: () => unknown) => fn())
}));

vi.mock("@console/core/actor", () => ({ withActor: mocks.withActor }));
vi.mock("@console/core/issue/processor", () => ({
	processCandidate: mocks.processCandidate
}));

import { handler } from "../../src/events/issue-ingress";

describe("Issue ingress handler", () => {
	it("processes candidates as system actor", async () => {
		const candidate = {
			source: {
				accountId: "123456789012",
				region: "ap-southeast-2",
				logGroup: "/aws/lambda/example",
				logStream: "stream"
			},
			events: [{ id: "event", timestamp: 1, message: "Error: failure" }]
		};

		await handler(
			{ Records: [{ body: JSON.stringify(candidate) }] } as never,
			{} as never,
			() => {}
		);

		expect(mocks.withActor).toHaveBeenCalledWith(
			{ type: "system", properties: {} },
			expect.any(Function)
		);
		expect(mocks.processCandidate).toHaveBeenCalledWith(candidate);
	});
});
