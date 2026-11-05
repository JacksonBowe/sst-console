import { z } from "zod";
import { StateKeySchema } from "./state";
import { StateUpdateErrorSchema } from "./state.update";

export * from "./state.update";

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
