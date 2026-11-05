import { AccountIdSchema } from "../util/aws";
import { z } from "zod";

import { db } from "../db";
import { fn } from "../util/fn";

import { StateKeySchema } from "./schema";
import * as Update from "./update";

export { StateKeySchema } from "./schema";

// Public State contract carries only its S3 locator and observation metadata.
// It is never a transport for raw checkpoint data.
export const StateSchema = StateKeySchema.extend({
	accountId: AccountIdSchema,
	sourceBucket: z.string().min(1),
	sourceKey: z.string().min(1),
	sourceVersion: z.string().min(1).optional(),
	observedAt: z.iso.datetime()
});

export type State = z.infer<typeof StateSchema>;

// Current State is mutable because SST repeatedly writes app/{app}/{stage}.json.
/** Upserts the locator and observation metadata for current State. */
export const upsert = fn(StateSchema, async input => {
	await db.entities.state.upsert(input).go({ response: "none" });
});

// Reads current source metadata only; callers fetch raw State from S3 when needed.
/** Reads current State source metadata without fetching the artifact from S3. */
export const get = fn(StateKeySchema, async input => {
	const result = await db.entities.state.get(input).go({ consistent: true });
	return result.data ? StateSchema.parse(result.data) : null;
});

/** Deletes all persisted State projections for one Stage. */
export const removeStageHistory = fn(StateKeySchema, async input => {
	await Update.removeForStage(input);
	await db.entities.state.delete(input).go({ response: "none" });
});
