import { describe, expect, it, vi } from "vitest";

const { writeChunk } = vi.hoisted(() => ({ writeChunk: vi.fn() }));
vi.mock("../../src/db", () => ({ db: {} }));
vi.mock("../../src/app/projection", () => ({ writeChunk }));

const { upsert } = await import("../../src/app/app.stage");

describe("Stage.upsert", () => {
	it("upserts the App and Stage together without Resources", async () => {
		const input = {
			accountId: "123456789012",
			region: "us-east-1",
			appName: "shop",
			stageName: "prod",
			now: "2026-01-01T00:00:00.000Z"
		};
		await upsert(input);
		expect(writeChunk).toHaveBeenCalledWith(input.accountId, input.region, [
			{ kind: "app", appName: input.appName, now: input.now },
			{
				kind: "stage",
				appName: input.appName,
				stageName: input.stageName,
				now: input.now
			}
		]);
	});
});
