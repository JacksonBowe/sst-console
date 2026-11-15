import {
	GetObjectCommand,
	HeadObjectCommand,
	ListObjectsV2Command,
	S3Client
} from "@aws-sdk/client-s3";
import { z } from "zod";
import { connect } from "../account/connector";
import * as Stage from "../app/app.stage";
import * as Connection from "../connection";
import { db } from "../db";
import { chunkArray } from "../util/chunk";
import { isMissingObject } from "../util/s3";
import { StateKeySchema } from "./schema";
import { stateErrors } from "./errors";
import { AccountIdSchema } from "../util/aws";
import { fn } from "../util/fn";
import { decodeSstStateBytes } from "./sst";
import * as StateEvent from "./resource-event";
import * as Update from "./update";
import { parseArtifactKey } from "./keys";
import { PublicError } from "../error";

const SnapshotKeySchema = StateKeySchema.extend({
	updateId: z.string().min(1)
});
export const StateSnapshotSchema = SnapshotKeySchema.extend({
	accountId: AccountIdSchema,
	sourceBucket: z.string().min(1),
	sourceKey: z.string().min(1),
	sourceVersion: z.string().min(1).optional(),
	lastModified: z.iso.datetime(),
	observedAt: z.iso.datetime(),
	processedAt: z.iso.datetime().optional()
});
export type StateSnapshot = z.infer<typeof StateSnapshotSchema>;

/** Records a discovered Snapshot without replacing an existing locator. */
export const create = fn(
	StateSnapshotSchema.omit({ processedAt: true }),
	async input => {
		const result = await db.transaction
			.write(({ stage, stateSnapshot }) => [
				stage
					.check(input)
					.where((a, op) => op.eq(a.accountId, input.accountId))
					.commit(),
				stateSnapshot.create(input).commit()
			])
			.go();
		if (!result.canceled) return true;
		const existing = await get(input);
		if (existing) return false;
		throw stateErrors.discoveryPersistenceFailed();
	}
);

/** Reads one Snapshot locator. */
export const get = fn(SnapshotKeySchema, async input => {
	const result = await db.entities.stateSnapshot
		.get(input)
		.go({ consistent: true });
	return result.data ? StateSnapshotSchema.parse(result.data) : null;
});

/** List Stage Snapshots consistently in SST's key order. */
export const list = fn(StateKeySchema, async input => {
	const result = await db.entities.stateSnapshot.query
		.snapshot(input)
		.go({ pages: "all", consistent: true });
	return result.data
		.map(item => StateSnapshotSchema.parse(item))
		.sort((a, b) =>
			a.sourceKey < b.sourceKey ? 1 : a.sourceKey > b.sourceKey ? -1 : 0
		);
});

const resourceSchema = z.object({
	urn: z.string().min(1),
	type: z.string().min(1),
	parent: z.string().optional(),
	custom: z.boolean().optional(),
	created: z.string().optional(),
	modified: z.string().optional()
});
type SnapshotResource = z.infer<typeof resourceSchema>;

async function readSnapshot(s3: S3Client, bucket: string, key: string) {
	const object = await s3.send(
		new GetObjectCommand({
			Bucket: bucket,
			Key: key
		})
	);
	if (!object.Body) throw stateErrors.snapshotEmpty();
	const bytes = await object.Body.transformToByteArray();
	const decoded = decodeSstStateBytes(bytes, object.ContentEncoding);
	const raw: unknown = JSON.parse(new TextDecoder().decode(decoded));
	const parsed = z
		.object({
			checkpoint: z.object({
				latest: z.object({ resources: z.array(resourceSchema) })
			})
		})
		.safeParse(raw);
	if (!parsed.success) throw stateErrors.snapshotResourcesMissing();
	return parsed.data.checkpoint.latest.resources;
}

/** Compare the current snapshot to the next lexicographical S3 key, as SST Console does. */
async function reconcile(
	s3: S3Client,
	snapshot: StateSnapshot,
	knownPrevious?: string
) {
	const key = {
		appName: snapshot.appName,
		stageName: snapshot.stageName,
		updateId: snapshot.updateId
	};
	const update = await Update.get(key);
	if (!update) return;
	try {
		const prefix = `snapshot/${snapshot.appName}/${snapshot.stageName}/`;
		const previous = await s3.send(
			new ListObjectsV2Command({
				Bucket: snapshot.sourceBucket,
				Prefix: prefix,
				StartAfter: snapshot.sourceKey,
				MaxKeys: 1
			})
		);
		let previousKey = previous.Contents?.[0]?.Key;
		// A previously observed predecessor may have since been deleted from S3.
		if (knownPrevious && (!previousKey || knownPrevious < previousKey))
			previousKey = knownPrevious;
		if (!previousKey) {
			const legacy = await s3.send(
				new ListObjectsV2Command({
					Bucket: snapshot.sourceBucket,
					Prefix: `history/${snapshot.appName}/${snapshot.stageName}/`,
					MaxKeys: 1
				})
			);
			previousKey = legacy.Contents?.[0]?.Key;
		}
		let before: SnapshotResource[] = [];
		if (previousKey) {
			try {
				before = await readSnapshot(
					s3,
					snapshot.sourceBucket,
					previousKey
				);
			} catch {
				await Update.update({
					...key,
					comparisonStatus: "unavailable",
					resourceCounts: null
				});
				return;
			}
		}
		const after = await readSnapshot(
			s3,
			snapshot.sourceBucket,
			snapshot.sourceKey
		);
		const old = new Map(before.map(resource => [resource.urn, resource]));
		const changes: Array<{
			resource: SnapshotResource;
			action: StateEvent.Action;
		}> = [];
		const counts = { created: 0, updated: 0, deleted: 0, unchanged: 0 };
		for (const resource of after) {
			const previousResource = old.get(resource.urn);
			if (!previousResource) {
				counts.created++;
				changes.push({ resource, action: "created" });
			} else if (previousResource.created !== resource.created) {
				counts.created++;
				counts.deleted++;
				changes.push(
					{ resource, action: "created" },
					{ resource: previousResource, action: "deleted" }
				);
			} else if (previousResource.modified !== resource.modified) {
				counts.updated++;
				changes.push({ resource, action: "updated" });
			} else counts.unchanged++;
			old.delete(resource.urn);
		}
		for (const resource of old.values()) {
			counts.deleted++;
			changes.push({ resource, action: "deleted" });
		}
		await StateEvent.clearSource(key, "snapshot");
		await StateEvent.writeSources(
			key,
			changes.map(({ resource, action }) => ({
				identity: {
					urn: resource.urn,
					resourceType: resource.type,
					...(resource.parent ? { parentUrn: resource.parent } : {}),
					...(resource.custom !== undefined
						? { custom: resource.custom }
						: {})
				},
				action,
				source: {
					snapshot: {
						...(resource.created
							? { createdAt: resource.created }
							: {}),
						...(resource.modified
							? { modifiedAt: resource.modified }
							: {}),
						present: true
					}
				}
			}))
		);
		await Update.update({
			...key,
			comparisonStatus: "available",
			resourceCounts: counts
		});
		await db.entities.stateSnapshot
			.patch(key)
			.set({ processedAt: new Date().toISOString() })
			.go();
	} catch (error) {
		await Update.update({
			...key,
			comparisonStatus: "unavailable",
			resourceCounts: null
		});
		throw error;
	}
}

/** Persists one Snapshot source, guarding Stage ownership and observation order. */
export const upsert = fn(StateSnapshotSchema, async input => {
	const { appName, stageName, lastModified } = input;
	// A fresh observation replaces the old locator and optional source version.
	const result = await db.transaction
		.write(({ stage, stateSnapshot }) => [
			stage
				.check({ appName, stageName })
				.where((a, op) => op.eq(a.accountId, input.accountId))
				.commit(),
			stateSnapshot
				.upsert(input)
				.where(
					(a, op) =>
						`(${op.notExists(a.lastModified)} OR ${op.lte(a.lastModified, lastModified)})`
				)
				.commit()
		])
		.go();
	if (result.canceled) {
		const existing = await get(input);
		if (existing && existing.lastModified > lastModified) return false;
		throw stateErrors.snapshotPersistenceFailed();
	}
	return true;
});

/** Ingests one Snapshot and reconciles its Stage history. */
export const receiveSnapshot = fn(
	z.object({
		accountId: AccountIdSchema,
		stateBucket: z.string().min(1),
		stateKey: z.string().min(1)
	}),
	async input => {
		const artifact = parseArtifactKey(input.stateKey);
		if (artifact?.kind !== "snapshot")
			return { status: "ignored" as const };
		const { appName, stageName, updateId } = artifact;
		const key = { appName, stageName, updateId };
		const { account, connection } = await connect(input.accountId);
		if (
			account.status !== "connected" ||
			account.stateBucket !== input.stateBucket
		)
			return { status: "ignored" as const };
		const policy = await Connection.getSyncPolicy(input.accountId);
		if (!Connection.Policy.includesStage(policy, key))
			return { status: "ignored" as const };
		const stage = await Stage.find(key);
		if (stage && stage.accountId !== input.accountId)
			return { status: "ignored" as const };
		const s3 = new S3Client({
			credentials: connection.credentials,
			region: account.region
		});
		let object;
		try {
			object = await s3.send(
				new HeadObjectCommand({
					Bucket: input.stateBucket,
					Key: input.stateKey
				})
			);
		} catch (error) {
			if (isMissingObject(error)) return { status: "ignored" as const };
			throw error;
		}
		if (!object.LastModified) throw stateErrors.snapshotTimestampMissing();
		const lastModified = object.LastModified.toISOString();
		const now = new Date().toISOString();
		if (!stage)
			await Stage.upsert({
				accountId: input.accountId,
				region: account.region,
				appName,
				stageName,
				now
			});
		const locator = {
			...key,
			accountId: input.accountId,
			sourceBucket: input.stateBucket,
			sourceKey: input.stateKey,
			...(object.VersionId ? { sourceVersion: object.VersionId } : {}),
			lastModified,
			observedAt: now
		};
		const persisted = await upsert(locator);
		if (!persisted) return { status: "ignored" as const };
		const snapshots = await list({ appName, stageName });
		const index = snapshots.findIndex(item => item.updateId === updateId);
		if (index < 0) throw stateErrors.snapshotMissingAfterWrite();
		const affected = new Set([updateId, snapshots[index + 1]?.updateId]);
		let failed = false;
		for (const id of affected) {
			if (!id) continue;
			try {
				const snapshot = snapshots.find(item => item.updateId === id);
				if (snapshot) {
					const predecessor = snapshots
						.filter(item => item.sourceKey > snapshot.sourceKey)
						.at(-1)?.sourceKey;
					await reconcile(s3, snapshot, predecessor);
				}
			} catch (error) {
				failed = true;
				const name = error instanceof Error ? error.name : "";
				const code = error instanceof PublicError ? error.code : "";
				console.warn("Snapshot reconciliation failed", {
					updateId: id,
					error: [
						"state.snapshot_empty",
						"state.snapshot_resources_missing",
						"state.event_persistence_failed"
					].includes(code)
						? code
						: [
									"AccessDenied",
									"AccessDeniedException",
									"NoSuchKey",
									"SyntaxError"
							  ].includes(name)
							? name
							: "processing_error"
				});
			}
		}
		if (failed) throw stateErrors.snapshotHistoryReconciliationFailed();
		return { status: "synced" as const };
	}
);

/** Deletes all Snapshot locators for one Stage. */
export const remove = fn(StateKeySchema, async input => {
	const snapshots = await list(input);
	for (const chunk of chunkArray(snapshots, 90)) {
		const result = await db.transaction
			.write(({ stateSnapshot }) =>
				chunk.map(snapshot => stateSnapshot.delete(snapshot).commit())
			)
			.go();
		if (result.canceled) throw stateErrors.historyRemovalFailed();
	}
});
