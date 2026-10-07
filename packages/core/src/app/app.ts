import { z } from "zod";

import { db } from "../db";
import { fn } from "../util/fn";
import { appErrors } from "./errors";
import { AppKeySchema, AppSchema } from "./schema";
import * as Stage from "./app.stage";

export type App = z.infer<typeof AppSchema>;

const ListSchema = z.object({
	summaries: z.boolean().default(false)
});

/** Creates one App projection. */
export const create = fn(AppSchema, async input => {
	await db.entities.app.create(input).go({ response: "none" });
});

/** Updates an existing App projection. */
export const update = fn(
	AppKeySchema.extend({ updatedAt: z.iso.datetime() }),
	async ({ appName, updatedAt }) => {
		await db.entities.app
			.patch({ appName })
			.set({ updatedAt })
			.go({ response: "none" });
	}
);

/** Lists every App projection by name, optionally with Stage summaries. */
export const list = fn(ListSchema, async ({ summaries }) => {
	const result = await db.entities.app.query.byName({}).go({ pages: "all" });
	const apps = result.data.map(app => AppSchema.parse(app));
	if (!summaries) return apps;
	return Promise.all(apps.map(summary));
});

/** Gets one App projection or throws when it does not exist. */
export const get = fn(AppKeySchema, async input => {
	const result = await db.entities.app.get(input).go({ consistent: true });
	if (!result.data) throw appErrors.notFound();
	return AppSchema.parse(result.data);
});

/** Returns one App and summaries of all its Stages. */
export const summary = fn(AppKeySchema, async input => {
	const app = await get(input);
	const stages = await Stage.list(input);
	return {
		...app,
		stages: await Promise.all(stages.map(Stage.summary))
	};
});
