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

		const [apps, stages, resources] = await Promise.all([
			db.entities.app.query.app({ accountId }).go({ pages: "all" }),
			db.entities.stage.query.stage({ accountId }).go({ pages: "all" }),
			db.entities.resource.query
				.resource({ accountId })
				.go({ pages: "all" })
		]);
		const snapshots = await Promise.all(
			stages.data.map(async stage => {
				const result = await db.entities.stateSnapshot.query
					.snapshot({
						accountId,
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
			apps: apps.data.map(app => ({
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
						resources: resources.data.filter(
							resource =>
								resource.appName === app.appName &&
								resource.stageName === stage.stageName
						)
					}))
			}))
		};
	}
);

function stageKey(appName: string, stageName: string): string {
	return `${appName}\u0000${stageName}`;
}
