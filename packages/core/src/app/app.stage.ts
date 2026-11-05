import { z } from "zod";

import { db } from "../db";
import { fn } from "../util/fn";
import { appErrors } from "./errors";
import { chunkArray } from "../util/chunk";
import { AppKeySchema, StageKeySchema, StageSchema } from "./schema";
import { writeChunk } from "./projection";

export type Stage = z.infer<typeof StageSchema>;

/** Creates one App Stage projection. */
export const create = fn(StageSchema, async input => {
	await db.entities.stage.create(input).go({ response: "none" });
});

/** Upserts the parent App and Stage without changing their Resources. */
export const upsert = fn(
	StageKeySchema.extend({
		accountId: z.string().regex(/^\d{12}$/),
		region: z.string().min(1),
		now: z.iso.datetime()
	}),
	async input => {
		await writeChunk(input.accountId, input.region, [
			{ kind: "app", appName: input.appName, now: input.now },
			{
				kind: "stage",
				appName: input.appName,
				stageName: input.stageName,
				now: input.now
			}
		]);
	}
);

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

// TODO: Combine all list() methods. They should take optional filters eg list() => return all stages, list({ appName }) => return all stages for one app, list({ accountId }) => return all stages for one account, etc. This will reduce the number of queries and simplify the API.
/** Lists every Stage in one App. */
export const list = fn(AppKeySchema, async input => {
	const result = await db.entities.stage.query
		.stage(input)
		.go({ pages: "all" });
	return result.data.map(stage => StageSchema.parse(stage));
});

/** Lists Stage identities owned by one Workload Account. */
export const listByAccount = fn(
	z.object({ accountId: z.string().regex(/^\d{12}$/) }),
	async input => {
		const result = await db.entities.stage.query
			.byAwsAccount(input)
			.go({ pages: "all" });
		return result.data.map(({ appName, stageName }) => ({
			appName,
			stageName
		}));
	}
);

/** Deletes Stage records after dependent data has been removed. */
export const remove = fn(
	z.union([StageKeySchema, z.array(StageKeySchema)]),
	async input => {
		if (!Array.isArray(input)) {
			await db.entities.stage.delete(input).go({ response: "none" });
			return;
		}
		const stages = input;
		for (const chunk of chunkArray(stages, 90)) {
			const result = await db.transaction
				.write(({ stage }) =>
					chunk.map(input => stage.delete(input).commit())
				)
				.go();
			if (result.canceled)
				throw appErrors.accountProjectionRemovalFailed(
					"Unable to remove account stage projections"
				);
		}
	}
);

/** Gets one App Stage projection or throws when it does not exist. */
export const get = fn(StageKeySchema, async input => {
	const result = await db.entities.stage.get(input).go({ consistent: true });
	if (!result.data) throw appErrors.stageNotFound();
	return StageSchema.parse(result.data);
});

/** Finds a Stage without treating absence as an error. */
export const find = fn(StageKeySchema, async input => {
	const result = await db.entities.stage.get(input).go({ consistent: true });
	return result.data ? StageSchema.parse(result.data) : null;
});

/** Returns summary data used by App listings. */
export async function summary(stage: Stage) {
	const [state, resources] = await Promise.all([
		db.entities.state
			.get({ appName: stage.appName, stageName: stage.stageName })
			.go({ consistent: true }),
		db.entities.resource.query
			.resource({ appName: stage.appName, stageName: stage.stageName })
			.go({ pages: "all" })
	]);
	return {
		stageName: stage.stageName,
		accountId: stage.accountId,
		region: stage.region,
		issueMonitoringEnabled: stage.issueMonitoringEnabled,
		createdAt: stage.createdAt,
		updatedAt: stage.updatedAt,
		state: state.data ?? null,
		resourceCount: resources.data.length
	};
}
