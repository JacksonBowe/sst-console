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
	observedAt: z.iso.datetime(),
	sstVersion: z.string().min(1),
	command: z.string(),
	timeStarted: z.iso.datetime(),
	timeCompleted: z.iso.datetime().optional(),
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
export const upsert = fn(StateUpdateInputSchema, async input => {
	const errors = truncateErrors(input.errors);
	const historyAt = input.timeCompleted ?? input.timeStarted;
	const update = {
		...input,
		command: truncateUtf8(input.command, maxCommandBytes),
		errors: errors.items,
		errorsSourceCount: input.errors.length,
		errorsStoredCount: errors.items.length,
		errorsTruncated: errors.truncated,
		reverseHistoryAt: reverseTimestampFor(historyAt),
		createdAt: input.observedAt
	};
	await db.entities.stateUpdate.upsert(update).go({ response: "none" });
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
