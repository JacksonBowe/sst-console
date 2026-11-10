import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	verify: vi.fn(),
	upsert: vi.fn(),
	create: vi.fn(),
	remove: vi.fn(),
	publish: vi.fn()
}));
vi.mock("sst", () => ({ Resource: { Bus: "bus" } }));
vi.mock("sst/aws/bus", () => ({ bus: { publish: mocks.publish } }));
vi.mock("../../src/connection", () => ({ upsert: mocks.upsert }));
vi.mock("../../src/account/account", () => ({ create: mocks.create }));
vi.mock("../../src/account/connector", () => ({ verify: mocks.verify }));
vi.mock("../../src/account/projection", () => ({
	removeAccountProjections: mocks.remove
}));

const { register, Events } = await import("../../src/account/registration");
const input = {
	accountId: "123456789012",
	region: "us-east-1",
	roleArn:
		"arn:aws:iam::123456789012:role/SSTConsoleRole-123456789012-0123456789abcdef"
};

describe("account registration", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mocks.verify.mockResolvedValue({ accountId: input.accountId });
	});

	it("verifies and registers a connected account", async () => {
		await expect(
			register({ ...input, requestType: "Create" })
		).resolves.toEqual({
			accountId: input.accountId,
			status: "connected"
		});
		expect(mocks.verify).toHaveBeenCalledWith({
			region: input.region,
			roleArn: input.roleArn
		});
		expect(mocks.upsert).toHaveBeenCalledWith(
			expect.objectContaining(input)
		);
		expect(mocks.create).toHaveBeenCalledWith(
			expect.objectContaining({ ...input, status: "connected" })
		);
		expect(mocks.publish).toHaveBeenCalledWith("bus", Events.Connected, {
			accountId: input.accountId
		});
		expect(mocks.remove).not.toHaveBeenCalled();
	});

	it("cleans projections before recording a disconnect", async () => {
		await expect(
			register({ ...input, requestType: "Delete" })
		).resolves.toEqual({
			accountId: input.accountId,
			status: "disconnected"
		});
		expect(mocks.remove).toHaveBeenCalledWith(input.accountId);
		expect(mocks.remove.mock.invocationCallOrder[0]).toBeLessThan(
			mocks.create.mock.invocationCallOrder[0]!
		);
		expect(mocks.verify).not.toHaveBeenCalled();
		expect(mocks.publish).not.toHaveBeenCalled();
	});

	it("does not register an account when verification returns a different identity", async () => {
		mocks.verify.mockResolvedValue({ accountId: "999999999999" });
		await expect(
			register({ ...input, requestType: "Create" })
		).rejects.toThrow();
		expect(mocks.upsert).not.toHaveBeenCalled();
		expect(mocks.create).not.toHaveBeenCalled();
	});
});
