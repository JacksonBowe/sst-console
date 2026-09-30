import { z } from "zod";

import { db } from "../db";
import { InputError } from "../error";
import { fn } from "../util/fn";

const appInput = z.object({ appName: z.string().min(1) });
const stageInput = appInput.extend({ stageName: z.string().min(1) });

export const list = async () => {
	console.log('test')
	const apps = await db.entities.app.query.byName({}).go({ pages: "all" });
	return Promise.all(apps.data.map(app => summary(app)));
};

export const inspect = fn(appInput, async ({ appName }) => {
	const app = await db.entities.app.get({ appName }).go({ consistent: true });
	if (!app.data) {
		throw new InputError("app_not_found", "SST app was not found");
	}
	return summary(app.data);
});

export const inspectStage = fn(stageInput, async ({ appName, stageName }) => {
	const stage = await db.entities.stage
		.get({ appName, stageName })
		.go({ consistent: true });
	if (!stage.data) {
		throw new InputError("stage_not_found", "SST stage was not found");
	}

	const [snapshot, resources] = await Promise.all([
		db.entities.stateSnapshot.query
			.snapshot({ appName, stageName })
			.go({ limit: 1 }),
		db.entities.resource.query
			.resource({ appName, stageName })
			.go({ pages: "all" })
	]);
	return {
		appName,
		stageName,
		accountId: stage.data.accountId,
		region: stage.data.region,
		createdAt: stage.data.createdAt,
		updatedAt: stage.data.updatedAt,
		latestSnapshot: snapshot.data[0] ?? null,
		resources: resourceTree(resources.data)
	};
});

async function summary(app: {
	appName: string;
	createdAt: string;
	updatedAt: string;
}) {
	const stages = await db.entities.stage.query
		.stage({ appName: app.appName })
		.go({ pages: "all" });
	const stageSummaries = await Promise.all(
		stages.data.map(async stage => {
			const [snapshot, resources] = await Promise.all([
				db.entities.stateSnapshot.query
					.snapshot({
						appName: stage.appName,
						stageName: stage.stageName
					})
					.go({ limit: 1 }),
				db.entities.resource.query
					.resource({
						appName: stage.appName,
						stageName: stage.stageName
					})
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
		})
	);

	return {
		appName: app.appName,
		createdAt: app.createdAt,
		updatedAt: app.updatedAt,
		stages: stageSummaries
	};
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
