import { Buffer } from "node:buffer";

import { z } from "zod";

import { db } from "../db";
import { fn } from "../util/fn";
import { StateKeySchema } from "./state";

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
	accountId: z.string().regex(/^\d{12}$/),
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

export type StateUpdateObjectKey = z.infer<typeof StateUpdateObjectKeySchema>;

const StateUpdateObjectKeySchema = StateKeySchema.extend({
	updateId: z.string().min(1),
	key: z.string().min(1)
});

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

/** Normalizes S3 hexadecimal sequencers for DynamoDB's lexical comparison. */
export function normalizeSequencer(value: unknown): string | undefined {
	if (typeof value !== "string" || !/^[0-9a-fA-F]{1,256}$/.test(value))
		return;
	return value.toUpperCase().padStart(256, "0");
}

/** Parses exactly one immutable SST update artifact key. */
export function parseObjectKey(key: string): StateUpdateObjectKey | undefined {
	const match = /^update\/([^/]+)\/([^/]+)\/([^/]+)\.json$/.exec(key);
	if (!match) return;
	const [appName, stageName, updateId] = match.slice(1);
	if (!appName || !stageName || !updateId) return;
	return { appName, stageName, updateId, key };
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

// Update deliveries are at-least-once. Upsert makes duplicate artifacts converge
// while keeping DynamoDB payloads bounded before they are persisted.
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
export const get = fn(
	StateKeySchema.extend({ updateId: StateUpdateInputSchema.shape.updateId }),
	async input => {
		const result = await db.entities.stateUpdate
			.get(input)
			.go({ consistent: true });
		return result.data ? StateUpdateSchema.parse(result.data) : null;
	}
);

export function outcomeFor(
	update: Pick<StateUpdate, "timeCompleted" | "errors">
) {
	if (!update.timeCompleted) return "running" as const;
	return update.errors.length === 0 ? "succeeded" : "failed";
}

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

function reverseTimestampFor(value: string): string {
	// DynamoDB sorts ascending; invert epoch milliseconds for newest-first history.
	const timestamp = new Date(value).getTime();
	return String(maximumTimestamp - timestamp).padStart(13, "0");
}
