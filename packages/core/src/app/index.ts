import { db } from "../db";
import { fn } from "../util/fn";
import * as App from "./app";
import * as Stage from "./app.stage";
import { AppKeySchema, StageKeySchema } from "./schema";

export * from "./app";
export * as Resource from "./resource";
export { Events } from "./events";
export type { StageAccountConflict } from "./ownership";
export * as Stage from "./app.stage";
export { appErrors } from "./errors";
export { AppKeySchema, AppSchema, StageKeySchema, StageSchema } from "./schema";

/** DEPR: Superseded by get() and summary(). */
export const inspect = fn(AppKeySchema, async input => App.summary(input));

/** DEPR: Superseded by Stage.get(). */
export const inspectStage = fn(StageKeySchema, async input => {
	const stage = await Stage.get(input);
	const [state, resources] = await Promise.all([
		db.entities.state.get(input).go({ consistent: true }),
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
		state: state.data ?? null,
		resources: resourceTree(resources.data)
	};
});

export function resourceTree<
	T extends { resourceId: string; parentResourceId?: string }
>(resources: T[]): Array<T & { children: Array<T & { children: T[] }> }> {
	const byId = new Map(
		resources.map(resource => [resource.resourceId, resource])
	);
	// Promote missing parents and cycles to roots so no projection disappears.
	const parentOf = (resource: T): string | undefined => {
		const parent = resource.parentResourceId;
		if (!parent || !byId.has(parent)) return undefined;
		const seen = new Set([resource.resourceId]);
		let current: string | undefined = parent;
		while (current && byId.has(current)) {
			if (seen.has(current)) return undefined;
			seen.add(current);
			current = byId.get(current)?.parentResourceId;
		}
		return parent;
	};
	const children = new Map<string, T[]>();
	for (const resource of resources) {
		const parent = parentOf(resource);
		if (!parent) continue;
		const current = children.get(parent) ?? [];
		current.push(resource);
		children.set(parent, current);
	}
	const build = (
		resource: T
	): T & { children: Array<T & { children: T[] }> } => ({
		...resource,
		children: (children.get(resource.resourceId) ?? []).map(build)
	});
	return resources.filter(resource => !parentOf(resource)).map(build);
}
