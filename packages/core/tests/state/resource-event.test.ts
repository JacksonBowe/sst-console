import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("sst", () => ({
	Resource: {
		ConsoleData: { name: "test" },
		ConsoleConnections: { name: "test" }
	}
}));
const { parseOperations } = await import("../../src/state/event-log");
const { db } = await import("../../src/db");
const { clearSource } = await import("../../src/state/resource-event");

describe("State Resource events", () => {
	afterEach(() => vi.restoreAllMocks());
	it("extracts only operation timing and outcomes from engine events", () => {
		const meta = { urn: "urn:resource", type: "aws:example", op: "create" };
		const text = [
			{
				timestamp: 1,
				resourcePreEvent: {
					metadata: meta,
					inputs: { password: "secret" }
				}
			},
			{ timestamp: 2, diagnosticEvent: { message: "secret" } },
			{
				timestamp: 3,
				resOpFailedEvent: { metadata: meta, message: "secret" }
			}
		]
			.map(value => JSON.stringify(value))
			.join("\n");
		const events = parseOperations(text);
		expect(events).toEqual([
			{
				urn: "urn:resource",
				resourceType: "aws:example",
				action: "created",
				startedAt: "1970-01-01T00:00:01.000Z",
				completedAt: "1970-01-01T00:00:03.000Z",
				outcome: "failed"
			}
		]);
		expect(JSON.stringify(events)).not.toContain("secret");
	});

	it("keys events by Stage, Update, resource and action", () => {
		const key = {
			appName: "shop",
			stageName: "prod",
			updateId: "id",
			resourceId: "hash",
			action: "created" as const
		};
		expect(db.entities.stateEvent.get(key).params().Key).toEqual({
			pk: "APP#shop#STAGE#prod",
			sk: "STATE_EVENT#id#hash#created"
		});
		expect(
			db.entities.stateEvent.query.event(key).params().IndexName
		).toBeUndefined();
	});

	it("clears source facts in transaction-sized chunks", async () => {
		const rows = Array.from({ length: 200 }, (_, index) => ({
			resourceId: String(index),
			action: "created" as const,
			snapshot: { present: true },
			...(index % 2 ? { operation: { outcome: "succeeded" } } : {})
		}));
		vi.spyOn(db.entities.stateEvent.query, "event").mockReturnValue({
			go: async () => ({ data: rows })
		} as never);
		const counts: number[] = [];
		vi.spyOn(db.transaction, "write").mockImplementation(((
			build: (entities: any) => unknown[]
		) => {
			const stateEvent = {
				patch: () => ({ remove: () => ({ commit: () => "patch" }) }),
				delete: () => ({ commit: () => "delete" })
			};
			counts.push(build({ stateEvent }).length);
			return { go: async () => ({ canceled: false }) };
		}) as never);
		await clearSource(
			{ appName: "shop", stageName: "prod", updateId: "id" },
			"snapshot"
		);
		expect(counts).toEqual([90, 90, 20]);
	});
});
