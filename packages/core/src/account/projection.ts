import { db } from "../db";
import { ServerError } from "../error";

const maxTransactionActions = 90;

export async function removeAccountProjections(accountId: string) {
	const [stages, discoveredStages] = await Promise.all([
		db.entities.stage.query.byAccount({ accountId }).go({ pages: "all" }),
		db.entities.discoveredStage.query
			.discovery({ accountId })
			.go({ pages: "all" })
	]);
	const resources = (
		await Promise.all(
			stages.data.map(stage =>
				db.entities.resource.query
					.resource({
						appName: stage.appName,
						stageName: stage.stageName
					})
					.go({ pages: "all" })
			)
		)
	).flatMap(result => result.data);

	await deleteResources(resources);
	await deleteStages(stages.data);
	await deleteDiscoveredStages(discoveredStages.data);
	await removeEmptyApps(stages.data.map(stage => stage.appName));
}

async function deleteResources(
	resources: Array<{ appName: string; stageName: string; resourceId: string }>
) {
	for (const chunk of chunkArray(resources, maxTransactionActions)) {
		const transaction = await db.transaction
			.write(({ resource }) =>
				chunk.map(item =>
					resource
						.delete({
							appName: item.appName,
							stageName: item.stageName,
							resourceId: item.resourceId
						})
						.commit()
				)
			)
			.go();
		if (transaction.canceled)
			throw new ServerError(
				"projection_removal_failed",
				"Unable to remove account resource projections"
			);
	}
}

async function deleteStages(
	stages: Array<{ appName: string; stageName: string }>
) {
	for (const chunk of chunkArray(stages, maxTransactionActions)) {
		const transaction = await db.transaction
			.write(({ stage }) =>
				chunk.map(item =>
					stage
						.delete({
							appName: item.appName,
							stageName: item.stageName
						})
						.commit()
				)
			)
			.go();
		if (transaction.canceled)
			throw new ServerError(
				"projection_removal_failed",
				"Unable to remove account stage projections"
			);
	}
}

async function deleteDiscoveredStages(
	stages: Array<{ accountId: string; appName: string; stageName: string }>
) {
	for (const chunk of chunkArray(stages, maxTransactionActions)) {
		const transaction = await db.transaction
			.write(({ discoveredStage }) =>
				chunk.map(item =>
					discoveredStage
						.delete({
							accountId: item.accountId,
							appName: item.appName,
							stageName: item.stageName
						})
						.commit()
				)
			)
			.go();
		if (transaction.canceled)
			throw new ServerError(
				"projection_removal_failed",
				"Unable to remove account discovery projections"
			);
	}
}

async function removeEmptyApps(appNames: string[]) {
	for (const appName of new Set(appNames)) {
		const stages = await db.entities.stage.query
			.stage({ appName })
			.go({ limit: 1 });
		if (stages.data.length > 0) continue;
		await db.entities.app.delete({ appName }).go({ response: "none" });
	}
}

function chunkArray<T>(items: T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let index = 0; index < items.length; index += size)
		chunks.push(items.slice(index, index + size));
	return chunks;
}
