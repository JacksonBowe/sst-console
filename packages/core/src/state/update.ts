import { AccountIdSchema } from "../util/aws";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { connect } from "../account/connector";
import { accountErrors } from "../account/errors";
import * as Connection from "../connection";
import * as Stage from "../app/app.stage";
import { isMissingObject } from "../util/s3";
import { chunkArray } from "../util/chunk";
import { stateErrors } from "./errors";
import { decodeSstStateBytes } from "./sst";
import { updateObjectKey } from "./keys";

import { Buffer } from "node:buffer";

import { z } from "zod";

import { db } from "../db";
import { fn } from "../util/fn";
import { StateKeySchema } from "./schema";

const maxCommandBytes = 8 * 1024;
const maxErrorsBytes = 64 * 1024;
const maximumTimestamp = 9_999_999_999_999;

// Public contracts accept only Console-safe metadata. Raw SST State, Pulumi
// inputs/outputs, and event-log data must never cross this domain boundary.
export const StateUpdateErrorSchema = z.object({
	urn: z.string(),
	message: z.string()
});

export const StateUpdateInputSchema = StateKeySchema.extend({
	accountId: AccountIdSchema,
	updateId: z.string().min(1),
	sourceBucket: z.string().min(1),
	sourceKey: z.string().min(1),
	sourceVersion: z.string().min(1).optional(),
	sequencer: z.string().regex(/^[0-9A-F]{256}$/),
	observedAt: z.iso.datetime(),
	sstVersion: z.string().min(1),
	command: z.string(),
	timeStarted: z.iso.datetime({ offset: true }).optional(),
	timeCompleted: z.iso.datetime({ offset: true }).optional(),
	errors: z.array(StateUpdateErrorSchema)
});

export const StateUpdateSchema = StateUpdateInputSchema.extend({
	errorsSourceCount: z.number().int().nonnegative(),
	errorsStoredCount: z.number().int().nonnegative(),
	errorsTruncated: z.boolean(),
	createdCount: z.number().int().nonnegative(),
	updatedCount: z.number().int().nonnegative(),
	deletedCount: z.number().int().nonnegative(),
	unchangedCount: z.number().int().nonnegative(),
	createdAt: z.iso.datetime()
});

export type StateUpdate = z.infer<typeof StateUpdateSchema>;

// Update deliveries are at-least-once. Upsert makes duplicate artifacts converge
// while keeping DynamoDB payloads bounded before they are persisted.
/** Persists bounded Update metadata while guarding ownership and event ordering. */
export const upsert = fn(StateUpdateInputSchema, async input => {
	const errors = truncateErrors(input.errors);
	const historyAt = input.timeCompleted ?? input.timeStarted;
	if (!historyAt) throw new Error("State Update has no timestamp");
	const update = {
		...input,
		command: truncateUtf8(input.command, maxCommandBytes),
		errors: errors.items,
		errorsSourceCount: input.errors.length,
		errorsStoredCount: errors.items.length,
		errorsTruncated: errors.truncated,
		reverseHistoryAt: reverseTimestampFor(historyAt)
	};
	const result = await db.transaction
		.write(({ stage, stateUpdate }) => [
			stage
				.check({ appName: input.appName, stageName: input.stageName })
				.where((a, op) => op.eq(a.accountId, input.accountId))
				.commit(),
			stateUpdate
				.upsert(update)
				.ifNotExists({
					createdCount: 0,
					updatedCount: 0,
					deletedCount: 0,
					unchangedCount: 0,
					createdAt: input.observedAt
				})
				.where(
					(a, op) =>
						`(${op.notExists(a.sequencer)} OR (${op.eq(a.sourceBucket, input.sourceBucket)} AND ${op.eq(a.sourceKey, input.sourceKey)} AND ${op.lt(a.sequencer, input.sequencer)}))`
				)
				.commit()
		])
		.go();
	if (result.canceled) {
		const stage = await db.entities.stage
			.get({ appName: input.appName, stageName: input.stageName })
			.go({ consistent: true });
		if (stage.data?.accountId !== input.accountId) return false;
		const existing = await db.entities.stateUpdate
			.get(input)
			.go({ consistent: true });
		if (
			existing.data?.sequencer &&
			(existing.data.sourceBucket !== input.sourceBucket ||
				existing.data.sourceKey !== input.sourceKey ||
				existing.data.sequencer >= input.sequencer)
		)
			return false;
		throw new Error("Unable to persist State Update");
	}
	return true;
});

// Detail reads use State Update's primary key; history listing uses its lookup index.
/** Reads one State Update by its Stage and Update identity. */
export const get = fn(
	StateKeySchema.extend({ updateId: StateUpdateInputSchema.shape.updateId }),
	async input => {
		const result = await db.entities.stateUpdate
			.get(input)
			.go({ consistent: true });
		return result.data ? StateUpdateSchema.parse(result.data) : null;
	}
);

/** Derives the current outcome from Update completion and errors. */
export function outcomeFor(
	update: Pick<StateUpdate, "timeCompleted" | "errors">
) {
	if (!update.timeCompleted) return "running" as const;
	return update.errors.length === 0 ? "succeeded" : "failed";
}

// TODO: This looks like a generic helper, does it need to be in this file?
/** Bounds the serialized error list and reports whether it was truncated. */
function truncateErrors(errors: Array<{ urn: string; message: string }>): {
	items: Array<{ urn: string; message: string }>;
	truncated: boolean;
} {
	// Budget JSON bytes rather than JavaScript characters. DynamoDB stores UTF-8,
	// and JSON escaping can expand a diagnostic beyond its original string length.
	const items: Array<{ urn: string; message: string }> = [];
	let bytes = 0;
	for (const error of errors) {
		const errorBytes = Buffer.byteLength(JSON.stringify(error));
		if (bytes + errorBytes <= maxErrorsBytes) {
			items.push(error);
			bytes += errorBytes;
			continue;
		}
		const available = maxErrorsBytes - bytes;
		const message = truncateErrorMessage(error, available);
		if (message !== undefined) {
			items.push({ urn: error.urn, message });
		}
		return { items, truncated: true };
	}
	return { items, truncated: false };
}

// TODO: This looks like a generic helper, does it need to be in this file?
/** Truncates a string to a UTF-8 byte budget without splitting code points. */
function truncateUtf8(value: string, maxBytes: number): string {
	if (Buffer.byteLength(value) <= maxBytes) return value;
	const characters = Array.from(value);
	let lower = 0;
	let upper = characters.length;
	while (lower < upper) {
		const middle = Math.ceil((lower + upper) / 2);
		if (Buffer.byteLength(characters.slice(0, middle).join("")) <= maxBytes)
			lower = middle;
		else upper = middle - 1;
	}
	return characters.slice(0, lower).join("");
}

// TODO: This looks like a generic helper, does it need to be in this file? It also seems very similar to truncateErrors
/** Fits an error message within a serialized JSON byte budget. */
function truncateErrorMessage(
	error: { urn: string; message: string },
	maxBytes: number
): string | undefined {
	// Binary search preserves whole Unicode code points and verifies serialized
	// JSON size, including escaping in either the URN or diagnostic message.
	if (
		Buffer.byteLength(JSON.stringify({ urn: error.urn, message: "" })) >
		maxBytes
	)
		return;
	const characters = Array.from(error.message);
	let lower = 0;
	let upper = characters.length;
	while (lower < upper) {
		const middle = Math.ceil((lower + upper) / 2);
		const message = characters.slice(0, middle).join("");
		if (
			Buffer.byteLength(JSON.stringify({ urn: error.urn, message })) <=
			maxBytes
		)
			lower = middle;
		else upper = middle - 1;
	}
	return characters.slice(0, lower).join("");
}

// TODO: This looks like a generic helper, does it need to be in this file?
/** Converts a timestamp to a newest-first DynamoDB sort key. */
function reverseTimestampFor(value: string): string {
	// DynamoDB sorts ascending; invert epoch milliseconds for newest-first history.
	const timestamp = new Date(value).getTime();
	return String(maximumTimestamp - timestamp).padStart(13, "0");
}

const SstUpdateSchema = z.object({
	id: z.string().min(1),
	version: z.string().min(1),
	command: z.string(),
	timeStarted: z.preprocess(
		value => (value === "" ? undefined : value),
		z.iso.datetime({ offset: true }).optional()
	),
	timeCompleted: z.iso.datetime({ offset: true }).optional(),
	errors: z.array(StateUpdateErrorSchema).nullable()
});

// TODO: This looks like a generic helper, does it need to be in this file?
/** Normalizes S3 hexadecimal sequencers for DynamoDB's lexical comparison. */
export function normalizeSequencer(value: unknown): string | undefined {
	if (typeof value !== "string" || !/^[0-9a-fA-F]{1,256}$/.test(value))
		return;
	return value.toUpperCase().padStart(256, "0");
}

/**
 * Selects Console-safe fields from one SST Update object. SST serializes an
 * empty Go error slice as null, which has the same update outcome as [].
 */
export function parseSstUpdate(value: string):
	| {
			updateId: string;
			sstVersion: string;
			command: string;
			timeStarted?: string;
			timeCompleted?: string;
			errors: Array<{ urn: string; message: string }>;
	  }
	| undefined {
	let json: unknown;
	try {
		json = JSON.parse(value);
	} catch {
		return;
	}
	const parsed = SstUpdateSchema.safeParse(json);
	if (!parsed.success) return;
	if (!parsed.data.timeStarted && !parsed.data.timeCompleted) return;
	return {
		updateId: parsed.data.id,
		sstVersion: parsed.data.version,
		command: parsed.data.command,
		...(parsed.data.timeStarted
			? { timeStarted: parsed.data.timeStarted }
			: {}),
		...(parsed.data.timeCompleted
			? { timeCompleted: parsed.data.timeCompleted }
			: {}),
		errors: parsed.data.errors ?? []
	};
}

/** Reads an SST Update artifact and persists its Console-safe metadata. */
export const receiveUpdate = fn(
	z.object({
		accountId: AccountIdSchema,
		appName: z.string().min(1),
		stageName: z.string().min(1),
		updateId: z.string().min(1),
		sequencer: z.string().regex(/^[0-9A-F]{256}$/)
	}),
	async ({ accountId, appName, stageName, updateId, sequencer }) => {
		const stateKey = updateObjectKey(appName, stageName, updateId);
		const updateKey = { appName, stageName, updateId };
		const { account: accountData, connection } = await connect(accountId);
		const stateBucket = accountData.stateBucket;
		if (!stateBucket) throw accountErrors.notFound();

		const policy = await Connection.getSyncPolicy(accountId);
		if (!Connection.Policy.includesStage(policy, updateKey))
			return { accountId, stateKey, status: "ignored" as const };

		// This early check avoids fetching an artifact for another account.
		// The Update write checks ownership again atomically to guard races.
		const stage = await db.entities.stage
			.get({
				appName: updateKey.appName,
				stageName: updateKey.stageName
			})
			.go({ consistent: true });
		if (stage.data && stage.data.accountId !== accountId)
			return { accountId, stateKey, status: "ignored" as const };

		const s3 = new S3Client({
			credentials: connection.credentials,
			region: accountData.region
		});

		let object;
		try {
			object = await s3.send(
				new GetObjectCommand({ Bucket: stateBucket, Key: stateKey })
			);
		} catch (error) {
			if (isMissingObject(error))
				return { accountId, stateKey, status: "ignored" as const };
			throw error;
		}
		if (!object.Body)
			return { accountId, stateKey, status: "ignored" as const };

		const bytes = await object.Body.transformToByteArray();
		const update = parseSstUpdate(
			new TextDecoder().decode(
				decodeSstStateBytes(bytes, object.ContentEncoding)
			)
		);
		if (!update || update.updateId !== updateKey.updateId)
			return { accountId, stateKey, status: "ignored" as const };
		const { updateId: _, ...updateInput } = update;
		if (!stage.data) {
			const now = new Date().toISOString();
			await Stage.upsert({
				accountId,
				region: accountData.region,
				appName,
				stageName,
				now
			});
		}

		const persisted = await upsert({
			accountId,
			appName: updateKey.appName,
			stageName: updateKey.stageName,
			updateId: updateKey.updateId,
			sourceBucket: stateBucket,
			sourceKey: stateKey,
			sequencer,
			...(object.VersionId ? { sourceVersion: object.VersionId } : {}),
			observedAt: new Date().toISOString(),
			...updateInput
		});

		return {
			accountId,
			stateKey,
			status: persisted ? ("synced" as const) : ("ignored" as const)
		};
	}
);

/** Deletes all persisted Update records for a Stage. */
export const remove = fn(StateKeySchema, async input => {
	const updates = await db.entities.stateUpdate.query
		.update(input)
		.go({ pages: "all", consistent: true });
	for (const chunk of chunkArray(updates.data, 90)) {
		const transaction = await db.transaction
			.write(({ stateUpdate }) =>
				chunk.map(update =>
					stateUpdate
						.delete({
							appName: update.appName,
							stageName: update.stageName,
							updateId: update.updateId
						})
						.commit()
				)
			)
			.go();
		if (transaction.canceled) throw stateErrors.historyRemovalFailed();
	}
});
