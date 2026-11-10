import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
	records: new Map<string, any>(),
	objects: new Map<string, any>(),
	owner: "123456789012"
}));
vi.mock("@aws-sdk/client-s3", () => ({
	HeadObjectCommand: class {
		constructor(public input: any) {}
	},
	GetObjectCommand: class {
		constructor(public input: any) {}
	},
	ListObjectsV2Command: class {
		constructor(public input: any) {}
	},
	S3Client: class {
		async send(command: any) {
			if (command.input.Prefix) {
				const keys = [...m.objects.keys()]
					.filter(
						key =>
							key.startsWith(command.input.Prefix) &&
							(!command.input.StartAfter ||
								key > command.input.StartAfter)
					)
					.sort();
				return { Contents: keys.slice(0, 1).map(Key => ({ Key })) };
			}
			const object = m.objects.get(command.input.Key);
			if (!object)
				throw Object.assign(new Error("missing"), {
					name: "NoSuchKey"
				});
			return {
				LastModified: new Date(object.time),
				Body: {
					transformToByteArray: async () =>
						new TextEncoder().encode(
							object.text ??
								JSON.stringify({
									checkpoint: {
										latest: { resources: object.resources }
									}
								})
						)
				}
			};
		}
	}
}));
vi.mock("../../src/account/connector", () => ({
	connect: async () => ({
		account: {
			status: "connected",
			stateBucket: "bucket",
			region: "us-east-1"
		},
		connection: { credentials: {} }
	})
}));
vi.mock("../../src/connection", () => ({
	getSyncPolicy: async () => ({}),
	Policy: { includesStage: () => true }
}));
vi.mock("../../src/app/app.stage", () => ({
	upsert: vi.fn(),
	find: async () => ({ accountId: m.owner })
}));
vi.mock("../../src/state/sst", () => ({
	decodeSstStateBytes: (bytes: Uint8Array) => bytes,
	parseSstState: (bytes: Uint8Array) =>
		JSON.parse(new TextDecoder().decode(bytes)),
	normalizeSstState: (state: any) => ({
		resources: state.checkpoint.latest.resources
	})
}));
vi.mock("../../src/state/resource-event", () => ({
	clearSource: async (key: any, source: string) => {
		for (const [id, event] of m.records) {
			if (
				id.startsWith(
					`${key.appName}/${key.stageName}/resource/${key.updateId}/`
				)
			) {
				delete event[source];
				if (!event.snapshot && !event.operation) m.records.delete(id);
			}
		}
	},
	writeSources: async (key: any, events: any[]) => {
		for (const { identity: resource, action, source } of events) {
			const id = `${key.appName}/${key.stageName}/resource/${key.updateId}/${resource.urn}/${action}`;
			m.records.set(id, {
				...m.records.get(id),
				...resource,
				action,
				...source
			});
		}
	}
}));
vi.mock("../../src/db", () => {
	const key = (kind: string, item: any) =>
		`${item.appName}/${item.stageName}/${kind}/${item.updateId}`;
	const stage = {
		get: () => ({ go: async () => ({ data: { accountId: m.owner } }) }),
		check: () => ({ where: () => ({ commit: () => () => {} }) })
	};
	const entity = (kind: string) => ({
		query: {
			[kind === "snapshot" ? "snapshot" : "eventLog"]: (input: any) => ({
				go: async () => ({
					data: [...m.records.values()].filter(
						row =>
							row.appName === input.appName &&
							row.stageName === input.stageName &&
							row.kind === kind
					)
				})
			})
		},
		get: (input: any) => ({
			go: async () => ({ data: m.records.get(key(kind, input)) })
		}),
		upsert: (item: any) => ({
			where: () => ({
				commit: () => () =>
					m.records.set(key(kind, item), {
						...m.records.get(key(kind, item)),
						...item,
						kind
					})
			})
		}),
		delete: (item: any) => ({
			commit: () => () => m.records.delete(key(kind, item))
		}),
		patch: (input: any) => ({
			remove: () => ({
				go: async () => {
					const row = m.records.get(key(kind, input));
					if (row) delete row.summary;
				}
			}),
			set: (data: any) => ({
				go: async () =>
					Object.assign(m.records.get(key(kind, input)), data),
				where: () => ({
					commit: () => () =>
						Object.assign(m.records.get(key(kind, input)), data)
				})
			})
		})
	});
	const stateSnapshot = entity("snapshot");
	const stateEventLog = entity("eventlog");
	const stateUpdate = {
		get: (input: any) => ({
			go: async () => ({
				data: {
					...input,
					accountId: "123456789012",
					sourceBucket: "bucket",
					sourceKey: `update/${input.appName}/${input.stageName}/${input.updateId}.json`,
					observedAt: "2026-01-01T00:00:00Z",
					createdAt: "2026-01-01T00:00:00Z",
					...m.records.get(key("update", input))
				}
			})
		}),
		patch: (input: any) => {
			let changes: any = {};
			const patch = {
				set: (value: any) => {
					changes = { ...changes, ...value };
					return patch;
				},
				remove: () => {
					changes.resourceCounts = undefined;
					return patch;
				},
				go: async () =>
					m.records.set(key("update", input), {
						...m.records.get(key("update", input)),
						...changes
					})
			};
			return patch;
		}
	};
	return {
		db: {
			entities: { stage, stateSnapshot, stateEventLog, stateUpdate },
			transaction: {
				write: (callback: any) => ({
					go: async () => {
						callback({
							stage,
							stateSnapshot,
							stateEventLog
						}).forEach((write: () => void) => write());
						return { canceled: false };
					}
				})
			}
		}
	};
});

const {
	receiveSnapshot: receive,
	get: getSnapshot,
	list: listSnapshots,
	remove: removeSnapshots
} = await import("../../src/state/snapshot");
const {
	receiveEventLog,
	get: getEventLog,
	remove: removeEventLogs
} = await import("../../src/state/event-log");
const resource = (id: string) => ({
	resourceId: id,
	resourceKind: "resource",
	resourceType: "example",
	type: "example",
	urn: id,
	name: id
});
const input = (id: string, stage = "prod") => ({
	accountId: "123456789012",
	stateBucket: "bucket",
	stateKey: `snapshot/app/${stage}/${id}.json`
});

describe("snapshot ingestion", () => {
	beforeEach(() => {
		m.records.clear();
		m.objects.clear();
		m.owner = "123456789012";
	});

	it("recalculates a late snapshot and successor without affecting other Stages", async () => {
		m.objects.set(input("a").stateKey, {
			time: "2026-01-01T00:00:00Z",
			resources: [resource("a")]
		});
		m.objects.set(input("c").stateKey, {
			time: "2026-01-03T00:00:00Z",
			resources: [resource("a"), resource("b"), resource("c")]
		});
		m.objects.set(input("x", "dev").stateKey, {
			time: "2026-01-01T00:00:00Z",
			resources: [resource("x")]
		});
		await receive(input("a"));
		await receive(input("c"));
		await receive(input("x", "dev"));
		m.objects.set(input("b").stateKey, {
			time: "2026-01-02T00:00:00Z",
			resources: [resource("a"), resource("b")]
		});
		await receive(input("b"));
		expect(m.records.get("app/prod/update/b").resourceCounts).toMatchObject(
			{
				deleted: 1,
				unchanged: 2
			}
		);
		expect(m.records.get("app/prod/update/a").resourceCounts).toMatchObject(
			{
				deleted: 1,
				unchanged: 1
			}
		);
		expect(m.records.get("app/dev/update/x").resourceCounts.created).toBe(
			1
		);
	});

	it("marks comparison unavailable when a known predecessor is missing", async () => {
		m.objects.set(input("a").stateKey, {
			time: "2026-01-01T00:00:00Z",
			resources: [resource("a")]
		});
		m.objects.set(input("b").stateKey, {
			time: "2026-01-02T00:00:00Z",
			resources: [resource("b")]
		});
		await receive(input("b"));
		m.objects.delete(input("b").stateKey);
		await receive(input("a"));
		expect(m.records.get("app/prod/update/a")).toMatchObject({
			comparisonStatus: "unavailable"
		});
		expect(
			m.records.get("app/prod/update/a").resourceCounts
		).toBeUndefined();
	});

	it("does not treat a checkpoint without resources as empty", async () => {
		m.objects.set(input("a").stateKey, { time: "2026-01-01T00:00:00Z" });
		await expect(receive(input("a"))).rejects.toThrow(
			"Unable to reconcile"
		);
		expect(m.records.get("app/prod/snapshot/a").summary).toBeUndefined();
	});

	it("replays duplicate snapshot notifications without changing counts", async () => {
		m.objects.set(input("a").stateKey, {
			time: "2026-01-01T00:00:00Z",
			resources: [resource("a")]
		});
		await receive(input("a"));
		const summary = structuredClone(
			m.records.get("app/prod/update/a").resourceCounts
		);
		await receive(input("a"));
		expect(m.records.get("app/prod/update/a").resourceCounts).toEqual(
			summary
		);
	});

	it("persists allowlisted Resource fields without state inputs or outputs", async () => {
		m.objects.set(input("a").stateKey, {
			time: "2026-01-01T00:00:00Z",
			resources: [
				{
					...resource("a"),
					inputs: { password: "do-not-store-this-secret" },
					outputs: { secret: "do-not-store-this-secret" }
				}
			]
		});
		await receive(input("a"));
		expect(JSON.stringify([...m.records.values()])).not.toContain(
			"do-not-store-this-secret"
		);
		expect(m.records.get("app/prod/resource/a/a/created")).toMatchObject({
			urn: "a",
			resourceType: "example",
			action: "created"
		});
	});

	it("stores event logs separately and removes both entities with their Stage", async () => {
		m.objects.set(input("a").stateKey, {
			time: "2026-01-01T00:00:00Z",
			resources: [resource("a")]
		});
		const log = { ...input("a"), stateKey: "eventlog/app/prod/a.json" };
		m.objects.set(log.stateKey, { time: "2026-01-01T00:00:00Z", text: "" });
		await receive(input("a"));
		await receiveEventLog(log);
		expect(m.records.get("app/prod/eventlog/a")).toMatchObject({
			sourceKey: log.stateKey
		});
		expect(m.records.get("app/prod/eventlog/a").summary).toBeUndefined();
		expect(
			await getSnapshot({
				appName: "app",
				stageName: "prod",
				updateId: "a"
			})
		).toMatchObject({ sourceKey: input("a").stateKey });
		expect(
			await listSnapshots({ appName: "app", stageName: "prod" })
		).toHaveLength(1);
		expect(
			await getEventLog({
				appName: "app",
				stageName: "prod",
				updateId: "a"
			})
		).toMatchObject({ sourceKey: log.stateKey });
		await removeSnapshots({ appName: "app", stageName: "prod" });
		expect(
			await getSnapshot({
				appName: "app",
				stageName: "prod",
				updateId: "a"
			})
		).toBeNull();
		expect(
			await getEventLog({
				appName: "app",
				stageName: "prod",
				updateId: "a"
			})
		).not.toBeNull();
		await removeEventLogs({ appName: "app", stageName: "prod" });
		expect(m.records.has("app/prod/eventlog/a")).toBe(false);
	});

	it("merges Snapshot changes with Event Log timing and preserves operations on replay", async () => {
		m.objects.set(input("a").stateKey, {
			time: "2026-01-01T00:00:00Z",
			resources: [resource("a")]
		});
		const log = { ...input("a"), stateKey: "eventlog/app/prod/a.json" };
		const metadata = { urn: "a", type: "example", op: "create" };
		m.objects.set(log.stateKey, {
			time: "2026-01-01T00:00:00Z",
			text: [
				JSON.stringify({
					timestamp: 1,
					resourcePreEvent: { metadata }
				}),
				JSON.stringify({ timestamp: 2, resOutputsEvent: { metadata } })
			].join("\n")
		});
		await receiveEventLog(log);
		await receive(input("a"));
		await receive(input("a"));
		expect(m.records.get("app/prod/resource/a/a/created")).toMatchObject({
			snapshot: { present: true },
			operation: { outcome: "succeeded" }
		});
	});

	it("ignores keys belonging to the other artifact type", async () => {
		expect(
			await receive({
				...input("a"),
				stateKey: "eventlog/app/prod/a.json"
			})
		).toEqual({ status: "ignored" });
		expect(await receiveEventLog(input("a"))).toEqual({
			status: "ignored"
		});
		expect(m.records.size).toBe(0);
	});

	it("ignores artifact events for a Stage owned by another account", async () => {
		m.owner = "999999999999";
		expect(await receive(input("a"))).toEqual({ status: "ignored" });
		expect(m.records.size).toBe(0);
	});

	it("keeps key ordering when a snapshot is overwritten", async () => {
		for (const [id, day] of [
			["a", "01"],
			["b", "02"],
			["c", "03"]
		]) {
			m.objects.set(input(id!).stateKey, {
				time: `2026-01-${day}T00:00:00Z`,
				resources: [resource(id!)]
			});
			await receive(input(id!));
		}
		m.objects.set(input("a").stateKey, {
			time: "2026-01-04T00:00:00Z",
			resources: [resource("a")]
		});
		await receive(input("a"));
		expect(m.records.get("app/prod/update/b").resourceCounts).toMatchObject(
			{
				created: 1,
				deleted: 1
			}
		);
		expect(m.records.get("app/prod/update/a").resourceCounts).toMatchObject(
			{
				created: 1,
				deleted: 1
			}
		);
	});
});
