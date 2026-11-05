import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("sst", () => ({
	Resource: {
		ConsoleData: { name: "ConsoleData-test" },
		ConsoleConnections: { name: "ConsoleConnections-test" }
	}
}));

const { parseSstUpdate, normalizeSequencer, upsert } =
	await import("../../src/state/update");
const { dynamo } = await import("../../src/db/client");
const { db } = await import("../../src/db");

describe("SST update ingestion", () => {
	afterEach(() => vi.restoreAllMocks());

	it("atomically guards the update by sequencer, source, and Stage ownership", async () => {
		const send = vi.spyOn(dynamo, "send").mockResolvedValue({} as never);
		await upsert({
			accountId: "123456789012",
			appName: "app",
			stageName: "dev",
			updateId: "id",
			sourceBucket: "bucket",
			sourceKey: "update/app/dev/id.json",
			sequencer: normalizeSequencer("10")!,
			observedAt: "2026-01-01T00:00:00Z",
			sstVersion: "4",
			command: "deploy",
			timeCompleted: "2026-01-01T00:00:00Z",
			errors: [{ urn: "", message: "force unlocked" }]
		});
		const command = send.mock.calls[0]![0] as unknown as {
			input: {
				TransactItems: Array<{
					ConditionCheck?: { ConditionExpression: string };
					Update?: {
						ConditionExpression: string;
						UpdateExpression: string;
						ExpressionAttributeValues: Record<string, unknown>;
					};
				}>;
			};
		};
		const [stage, update] = command.input.TransactItems;
		expect(stage?.ConditionCheck?.ConditionExpression).toContain(
			"accountId"
		);
		expect(update?.Update?.ConditionExpression).toContain("sequencer");
		expect(update?.Update?.ConditionExpression).toContain("sourceBucket");
		expect(update?.Update?.ConditionExpression).toContain("sourceKey");
		expect(update?.Update?.ConditionExpression).toContain(" < ");
		expect(
			Object.values(update!.Update!.ExpressionAttributeValues)
		).toContain(normalizeSequencer("10"));
		// A force-unlock omits the start time, so an earlier observation survives.
		expect(update?.Update?.UpdateExpression).not.toContain("timeStarted");
	});

	it("ignores a delayed older write and duplicate after a completed write", async () => {
		let release!: () => void;
		const paused = new Promise<void>(resolve => {
			release = resolve;
		});
		let calls = 0;
		vi.spyOn(dynamo, "send").mockImplementation((async () => {
			const call = ++calls;
			if (call === 1) await paused;
			if (call !== 2) {
				const error = Object.assign(
					new Error("transaction cancelled"),
					{
						name: "TransactionCanceledException",
						CancellationReasons: [
							{ Code: "None" },
							{ Code: "ConditionalCheckFailed" }
						]
					}
				);
				throw error;
			}
			return {};
		}) as never);
		vi.spyOn(db.entities.stage, "get").mockReturnValue({
			go: async () => ({ data: { accountId: "123456789012" } })
		} as never);
		vi.spyOn(db.entities.stateUpdate, "get").mockReturnValue({
			go: async () => ({
				data: {
					sequencer: normalizeSequencer("10"),
					sourceBucket: "bucket",
					sourceKey: "update/app/dev/id.json"
				}
			})
		} as never);
		const input = {
			accountId: "123456789012",
			appName: "app",
			stageName: "dev",
			updateId: "id",
			sourceBucket: "bucket",
			sourceKey: "update/app/dev/id.json",
			observedAt: "2026-01-01T00:00:00Z",
			sstVersion: "4",
			command: "deploy",
			timeStarted: "2026-01-01T00:00:00Z",
			errors: []
		};
		const older = upsert({ ...input, sequencer: normalizeSequencer("f")! });
		const newer = await upsert({
			...input,
			sequencer: normalizeSequencer("10")!,
			timeCompleted: "2026-01-01T00:01:00Z",
			errors: [{ urn: "", message: "failed" }]
		});
		release();
		expect(newer).toBe(true);
		expect(await older).toBe(false);
		expect(
			await upsert({ ...input, sequencer: normalizeSequencer("10")! })
		).toBe(false);
	});
	it("normalizes variable-length hexadecimal sequencers for lexical ordering", () => {
		expect(normalizeSequencer("f")! < normalizeSequencer("10")!).toBe(true);
		expect(normalizeSequencer("000a")).toBe(normalizeSequencer("A"));
		for (const invalid of [undefined, "", "0x10", "g", "1".repeat(257)])
			expect(normalizeSequencer(invalid)).toBeUndefined();
	});
	it("accepts force-unlocked updates with no start time", () => {
		const value = JSON.stringify({
			id: "123",
			version: "4.0.0",
			command: "deploy",
			timeStarted: "",
			timeCompleted: "2026-01-01T00:00:00+01:00",
			errors: [{ urn: "", message: "force unlocked" }]
		});
		expect(parseSstUpdate(value)).toEqual({
			updateId: "123",
			sstVersion: "4.0.0",
			command: "deploy",
			timeCompleted: "2026-01-01T00:00:00+01:00",
			errors: [{ urn: "", message: "force unlocked" }]
		});
	});

	it("rejects updates without either timestamp", () => {
		expect(
			parseSstUpdate(
				JSON.stringify({
					id: "123",
					version: "4",
					command: "deploy",
					timeStarted: "",
					errors: null
				})
			)
		).toBeUndefined();
	});
});
