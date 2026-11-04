import { beforeEach, describe, expect, it, vi } from "vitest";

const { publish } = vi.hoisted(() => ({
	publish: vi.fn()
}));

vi.mock("sst", () => ({ Resource: { Bus: { name: "bus" } } }));
vi.mock("sst/aws/bus", () => ({ bus: { publish } }));
vi.mock("@console/core/actor", () => ({
	withActor: (_actor: unknown, callback: () => Promise<void>) => callback()
}));
vi.mock("@console/core/state", () => ({
	Events: { UpdateCreated: { type: "state.update.created" } },
	Update: {
		normalizeSequencer: (value: unknown) =>
			typeof value === "string" && /^[0-9a-f]+$/i.test(value)
				? value.toUpperCase().padStart(256, "0")
				: undefined
	}
}));

const { handler } = await import("../../src/events/state-external");

describe("state S3 events", () => {
	beforeEach(() => vi.clearAllMocks());

	it("passes update events to ingestion", async () => {
		await handler({
			account: "123456789012",
			"detail-type": "Object Created",
			detail: {
				bucket: { name: "bucket" },
				object: { key: "update/app/prod/id.json", sequencer: "a" }
			}
		});
		expect(publish).toHaveBeenCalledWith(
			{ name: "bus" },
			{ type: "state.update.created" },
			{
				accountId: "123456789012",
				stateBucket: "bucket",
				stateKey: "update/app/prod/id.json",
				sequencer: "0".repeat(255) + "A"
			}
		);
	});

	it("ignores update events with missing or invalid sequencers", async () => {
		for (const sequencer of [undefined, "not-hex"]) {
			await handler({
				account: "123456789012",
				"detail-type": "Object Created",
				detail: {
					bucket: { name: "bucket" },
					object: { key: "update/app/prod/id.json", sequencer }
				}
			});
		}
		expect(publish).not.toHaveBeenCalled();
	});

	it("ignores update deletion events", async () => {
		await handler({
			account: "123456789012",
			"detail-type": "Object Deleted",
			detail: {
				bucket: { name: "bucket" },
				object: { key: "update/app/prod/id.json" }
			}
		});
		expect(publish).not.toHaveBeenCalled();
	});
});
