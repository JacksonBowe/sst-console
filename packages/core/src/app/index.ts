import { db } from "../db";
import { fn } from "../util/fn";
import * as App from "./app";
import * as Stage from "./app.stage";
import { AppKeySchema, StageKeySchema } from "./schema";

export * from "./app";
export * as Stage from "./app.stage";
export { appErrors } from "./errors";
export { AppKeySchema, AppSchema, StageKeySchema, StageSchema } from "./schema";

/** DEPR: Superseded by get() and summary(). */
export const inspect = fn(AppKeySchema, async input => App.summary(input));

/** DEPR: Superseded by Stage.get(). */
export const inspectStage = fn(StageKeySchema, async input => {
	const stage = await Stage.get(input);
	const [snapshot, resources] = await Promise.all([
		db.entities.stateSnapshot.query.snapshot(input).go({ limit: 1 }),
		db.entities.resource.query.resource(input).go({ pages: "all" })
	]);
	return {
		appName: stage.appName,
		stageName: stage.stageName,
		accountId: stage.accountId,
		region: stage.region,
		issueMonitoringEnabled: stage.issueMonitoringEnabled,
		createdAt: stage.createdAt,
		updatedAt: stage.updatedAt,
		latestSnapshot: snapshot.data[0] ?? null,
		resources: resourceTree(resources.data)
	};
});

function resourceTree<
	T extends { resourceId: string; parentResourceId?: string }
>(resources: T[]): Array<T & { children: Array<T & { children: T[] }> }> {
	const children = new Map<string, T[]>();
	for (const resource of resources) {
		if (!resource.parentResourceId) continue;
		const current = children.get(resource.parentResourceId) ?? [];
		current.push(resource);
		children.set(resource.parentResourceId, current);
	}
	const build = (
		resource: T
	): T & { children: Array<T & { children: T[] }> } => ({
		...resource,
		children: (children.get(resource.resourceId) ?? []).map(build)
	});
	return resources.filter(resource => !resource.parentResourceId).map(build);
}
