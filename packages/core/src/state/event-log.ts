import {
	GetObjectCommand,
	HeadObjectCommand,
	S3Client
} from "@aws-sdk/client-s3";
import { z } from "zod";
import { connect } from "../account/connector";
import * as Stage from "../app/app.stage";
import * as Connection from "../connection";
import { db } from "../db";
import { AccountIdSchema } from "../util/aws";
import { chunkArray } from "../util/chunk";
import { fn } from "../util/fn";
import { isMissingObject } from "../util/s3";
import { StateKeySchema } from "./schema";
import { stateErrors } from "./errors";
import { decodeSstStateBytes } from "./sst";
import * as StateEvent from "./resource-event";
import { parseArtifactKey } from "./keys";

const metadata = z.object({
	urn: z.string().min(1),
	type: z.string().min(1),
	op: z.string()
});
const engineEvent = z.object({
	timestamp: z.number(),
	resourcePreEvent: z.object({ metadata }).optional(),
	resOutputsEvent: z.object({ metadata }).optional(),
	resOpFailedEvent: z.object({ metadata }).optional()
});

/** Select safe operation facts from newline-delimited Pulumi engine events. */
export function parseOperations(text: string) {
	const operations = new Map<
		string,
		{
			urn: string;
			resourceType: string;
			action: StateEvent.Action;
			startedAt: string;
			completedAt?: string;
			outcome: "unknown" | "succeeded" | "failed";
		}
	>();
	for (const line of text.split(/\r?\n/)) {
		if (!line.trim()) continue;
		const event = engineEvent.parse(JSON.parse(line));
		const pre = event.resourcePreEvent?.metadata;
		if (pre) {
			const action = (
				{
					create: "created",
					"create-replacement": "created",
					update: "updated",
					refresh: "updated",
					delete: "deleted",
					"delete-replaced": "deleted"
				} as Record<string, StateEvent.Action>
			)[pre.op];
			if (action) operations.delete(pre.urn + "\0" + pre.op);
			if (action)
				operations.set(pre.urn + "\0" + pre.op, {
					urn: pre.urn,
					resourceType: pre.type,
					action,
					startedAt: new Date(event.timestamp * 1000).toISOString(),
					outcome: "unknown"
				});
		}
		const done =
			event.resOpFailedEvent?.metadata ?? event.resOutputsEvent?.metadata;
		if (done) {
			const operation = operations.get(done.urn + "\0" + done.op);
			if (operation) {
				operation.completedAt = new Date(
					event.timestamp * 1000
				).toISOString();
				operation.outcome = event.resOpFailedEvent
					? "failed"
					: "succeeded";
			}
		}
	}
	return [...operations.values()];
}

const EventLogKeySchema = StateKeySchema.extend({
	updateId: z.string().min(1)
});

// Only the locator is stored; event-log contents may contain sensitive data.
export const StateEventLogSchema = EventLogKeySchema.extend({
	accountId: AccountIdSchema,
	sourceBucket: z.string().min(1),
	sourceKey: z.string().min(1),
	sourceVersion: z.string().min(1).optional(),
	lastModified: z.iso.datetime(),
	observedAt: z.iso.datetime(),
	processedAt: z.iso.datetime().optional()
});
export type StateEventLog = z.infer<typeof StateEventLogSchema>;

/** Records a discovered Event Log without replacing an existing locator. */
export const create = fn(
	StateEventLogSchema.omit({ processedAt: true }),
	async input => {
		const result = await db.transaction
			.write(({ stage, stateEventLog }) => [
				stage
					.check(input)
					.where((a, op) => op.eq(a.accountId, input.accountId))
					.commit(),
				stateEventLog.create(input).commit()
			])
			.go();
		if (!result.canceled) return true;
		const existing = await get(input);
		if (existing) return false;
		throw stateErrors.discoveryPersistenceFailed();
	}
);

/** Reads one Event Log source reference. */
export const get = fn(EventLogKeySchema, async input => {
	const result = await db.entities.stateEventLog
		.get(input)
		.go({ consistent: true });
	return result.data ? StateEventLogSchema.parse(result.data) : null;
});

/** Lists Stage Event Log locators by SST key. */
export const list = fn(StateKeySchema, async input => {
	const result = await db.entities.stateEventLog.query
		.eventLog(input)
		.go({ pages: "all", consistent: true });
	return result.data.map(item => StateEventLogSchema.parse(item)).reverse();
});

/** Persists a locator while guarding Stage ownership and observation order. */
export const upsert = fn(StateEventLogSchema, async input => {
	const { appName, stageName, lastModified } = input;
	// A complete observation replaces an optional version that is no longer present.
	const result = await db.transaction
		.write(({ stage, stateEventLog }) => [
			stage
				.check({ appName, stageName })
				.where((a, op) => op.eq(a.accountId, input.accountId))
				.commit(),
			stateEventLog
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
		throw stateErrors.eventLogPersistenceFailed();
	}
	return true;
});

/** Records a locator and derives safe operation facts from an Event Log. */
export const receiveEventLog = fn(
	z.object({
		accountId: AccountIdSchema,
		stateBucket: z.string().min(1),
		stateKey: z.string().min(1)
	}),
	async input => {
		const artifact = parseArtifactKey(input.stateKey);
		if (artifact?.kind !== "eventlog")
			return { status: "ignored" as const };
		const key = {
			appName: artifact.appName,
			stageName: artifact.stageName,
			updateId: artifact.updateId
		};
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
		if (!object.LastModified) throw stateErrors.eventLogTimestampMissing();
		const now = new Date().toISOString();
		if (!stage)
			await Stage.upsert({
				accountId: input.accountId,
				region: account.region,
				appName: key.appName,
				stageName: key.stageName,
				now
			});
		const persisted = await upsert({
			...key,
			accountId: input.accountId,
			sourceBucket: input.stateBucket,
			sourceKey: input.stateKey,
			...(object.VersionId ? { sourceVersion: object.VersionId } : {}),
			lastModified: object.LastModified.toISOString(),
			observedAt: now
		});
		if (persisted) {
			const data = await s3.send(
				new GetObjectCommand({
					Bucket: input.stateBucket,
					Key: input.stateKey,
					...(object.VersionId ? { VersionId: object.VersionId } : {})
				})
			);
			if (!data.Body) throw stateErrors.eventLogPersistenceFailed();
			const text = new TextDecoder().decode(
				decodeSstStateBytes(
					await data.Body.transformToByteArray(),
					data.ContentEncoding
				)
			);
			const operations = parseOperations(text);
			await StateEvent.clearSource(key, "operation");
			await StateEvent.writeSources(
				key,
				operations.map(
					({ urn, resourceType, action, ...operation }) => ({
						identity: { urn, resourceType },
						action,
						source: { operation }
					})
				)
			);
			await db.entities.stateEventLog
				.patch(key)
				.set({ processedAt: new Date().toISOString() })
				.go();
		}
		return {
			status: persisted ? ("synced" as const) : ("ignored" as const)
		};
	}
);

/** Deletes all Event Log locators for one Stage. */
export const remove = fn(StateKeySchema, async input => {
	const logs = await list(input);
	for (const chunk of chunkArray(logs, 90)) {
		const result = await db.transaction
			.write(({ stateEventLog }) =>
				chunk.map(log => stateEventLog.delete(log).commit())
			)
			.go();
		if (result.canceled) throw stateErrors.historyRemovalFailed();
	}
});
