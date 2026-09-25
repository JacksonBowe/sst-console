import { z } from "zod";

import { db } from "../db";
import { InputError } from "../error";
import { fn } from "../util/fn";

export const inspect = fn(
	z.object({ accountId: z.string().regex(/^\d{12}$/) }),
	async ({ accountId }) => {
		const account = await db.entities.account
			.get({ accountId })
			.go({ consistent: true });
		if (!account.data) {
			throw new InputError(
				"account_not_found",
				"Connected account was not found"
			);
		}

		const stages = await db.entities.stage.query
			.byAccount({ accountId })
			.go({ pages: "all" });
		const [apps, resourceResults] = await Promise.all([
			Promise.all(
				[...new Set(stages.data.map(stage => stage.appName))].map(
					appName =>
						db.entities.app
							.get({ appName })
							.go({ consistent: true })
				)
			),
			Promise.all(
				stages.data.map(stage =>
					db.entities.resource.query
						.resource({
							appName: stage.appName,
							stageName: stage.stageName
						})
						.go({ pages: "all" })
				)
			)
		]);
		const resources = resourceResults.flatMap(result => result.data);
		const snapshots = await Promise.all(
			stages.data.map(async stage => {
				const result = await db.entities.stateSnapshot.query
					.snapshot({
						appName: stage.appName,
						stageName: stage.stageName
					})
					.go({ limit: 1 });
				return [
					stageKey(stage.appName, stage.stageName),
					result.data[0]
				] as const;
			})
		);
		const latestSnapshots = new Map(snapshots);

		return {
			account: account.data,
			apps: apps
				.flatMap(result => (result.data ? [result.data] : []))
				.map(app => ({
					appName: app.appName,
					createdAt: app.createdAt,
					updatedAt: app.updatedAt,
					stages: stages.data
						.filter(stage => stage.appName === app.appName)
						.map(stage => ({
							stageName: stage.stageName,
							createdAt: stage.createdAt,
							updatedAt: stage.updatedAt,
							latestSnapshot:
								latestSnapshots.get(
									stageKey(app.appName, stage.stageName)
								) ?? null,
							resources: resourceTree(
								resources.filter(
									resource =>
										resource.appName === app.appName &&
										resource.stageName === stage.stageName
								)
							)
						}))
				}))
		};
	}
);

function stageKey(appName: string, stageName: string): string {
	return `${appName}\u0000${stageName}`;
}

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
