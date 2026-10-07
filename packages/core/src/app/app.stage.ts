import { z } from "zod";

import { db } from "../db";
import { fn } from "../util/fn";
import { appErrors } from "./errors";
import { AppKeySchema, StageKeySchema, StageSchema } from "./schema";

export type Stage = z.infer<typeof StageSchema>;

/** Creates one App Stage projection. */
export const create = fn(StageSchema, async input => {
	await db.entities.stage.create(input).go({ response: "none" });
});

/** Updates mutable fields on an existing App Stage projection. */
export const update = fn(
	StageKeySchema.extend({
		accountId: z.string().min(1).optional(),
		region: z.string().min(1).optional(),
		issueMonitoringEnabled: z.boolean().optional(),
		updatedAt: z.iso.datetime().optional()
	}).refine(
		input =>
			input.accountId !== undefined ||
			input.region !== undefined ||
			input.issueMonitoringEnabled !== undefined ||
			input.updatedAt !== undefined,
		"At least one Stage field must be updated"
	),
	async ({ appName, stageName, ...changes }) => {
		await db.entities.stage
			.patch({ appName, stageName })
			.set(changes)
			.go({ response: "none" });
	}
);

/** Lists every Stage in one App. */
export const list = fn(AppKeySchema, async input => {
	const result = await db.entities.stage.query
		.stage(input)
		.go({ pages: "all" });
	return result.data.map(stage => StageSchema.parse(stage));
});

/** Gets one App Stage projection or throws when it does not exist. */
export const get = fn(StageKeySchema, async input => {
	const result = await db.entities.stage.get(input).go({ consistent: true });
	if (!result.data) throw appErrors.stageNotFound();
	return StageSchema.parse(result.data);
});

/** Deletes one App Stage projection. */
export const remove = fn(StageKeySchema, async input => {
	await db.entities.stage.delete(input).go({ response: "none" });
});

/** Returns summary data used by App listings. */
export async function summary(stage: Stage) {
	const [snapshot, resources] = await Promise.all([
		db.entities.stateSnapshot.query
			.snapshot({ appName: stage.appName, stageName: stage.stageName })
			.go({ limit: 1 }),
		db.entities.resource.query
			.resource({ appName: stage.appName, stageName: stage.stageName })
			.go({ pages: "all" })
	]);
	return {
		stageName: stage.stageName,
		accountId: stage.accountId,
		region: stage.region,
		createdAt: stage.createdAt,
		updatedAt: stage.updatedAt,
		latestSnapshot: snapshot.data[0] ?? null,
		resourceCount: resources.data.length
	};
}
