import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { db } from "../db";
import { stateErrors } from "./errors";
import {
	decodeSstStateBytes,
	normalizeSstState,
	parseSstState,
	type NormalizedResource
} from "./sst";
import { removeStageHistory } from "./state";
import { removeStageMonitoring } from "../issue/monitoring";
import {
	partitionStageOwnership,
	type StageAccountConflict
} from "./ownership";
import type { StateObject } from "./discovery";
import { chunkArray } from "../util/chunk";

const maxTransactionActions = 90;
const maxTransactionBytes = 3 * 1024 * 1024;

export type StateProjection = StateObject & {
	resources: NormalizedResource[];
	sourceVersion?: string;
	sourceUpdatedAt: string;
};

export type ProjectionWrite =
	| { kind: "app"; appName: string; now: string }
	| { kind: "stage"; appName: string; stageName: string; now: string }
	| {
			kind: "resource";
			appName: string;
			stageName: string;
			resource: NormalizedResource;
			now: string;
	  }
	| {
			kind: "state";
			appName: string;
			stageName: string;
			sourceBucket: string;
			sourceKey: string;
			sourceVersion?: string;
			observedAt: string;
	  }
	| {
			kind: "deleteResource";
			appName: string;
			stageName: string;
			resourceId: string;
	  };

// TODO: Add high level comments
export async function loadProjection(
	s3: S3Client,
	bucket: string,
	state: StateObject
): Promise<StateProjection> {
	const object = await s3.send(
		new GetObjectCommand({ Bucket: bucket, Key: state.key })
	);
	if (!object.Body) {
		throw stateErrors.empty();
	}
	const bytes = await object.Body.transformToByteArray();
	const parsed = parseSstState(
		decodeSstStateBytes(bytes, object.ContentEncoding)
	);
	const sourceUpdatedAt =
		state.lastModified ??
		parsed.checkpoint.latest.manifest?.time ??
		new Date().toISOString();
	return {
		...state,
		resources: normalizeSstState(parsed).resources,
		sourceVersion: object.VersionId,
		sourceUpdatedAt
	};
}

// TODO: Add high level comments
export async function removeStateProjection(input: {
	accountId: string;
	appName: string;
	stageName: string;
}) {
	const stage = await db.entities.stage
		.get({ appName: input.appName, stageName: input.stageName })
		.go({ consistent: true });
	if (stage.data?.accountId !== input.accountId) return;
	await removeStageMonitoring(input);

	const resources = await db.entities.resource.query
		.resource({ appName: input.appName, stageName: input.stageName })
		.go({ pages: "all" });
	for (const chunk of chunkArray(resources.data, maxTransactionActions)) {
		const transaction = await db.transaction
			.write(({ resource }) =>
				chunk.map(item =>
					resource
						.delete({
							appName: input.appName,
							stageName: input.stageName,
							resourceId: item.resourceId
						})
						.commit()
				)
			)
			.go();
		if (transaction.canceled)
			throw stateErrors.syncPersistenceFailed(
				"Unable to remove SST state projections"
			);
	}
	await removeStageHistory(input);
	await db.entities.stage
		.delete({ appName: input.appName, stageName: input.stageName })
		.go({ response: "none" });
	await removeEmptyApps([input.appName]);
}

export async function removeDiscoveredStage(input: {
	accountId: string;
	appName: string;
	stageName: string;
}) {
	await db.entities.discoveredStage
		.delete({
			accountId: input.accountId,
			appName: input.appName,
			stageName: input.stageName
		})
		.go({ response: "none" });
}

// TODO: This desperately needs comments and docs about what it's doing and why
export async function buildWrites(input: {
	accountId: string;
	region: string;
	stateBucket: string;
	projections: StateProjection[];
	now: string;
}): Promise<{
	writes: ProjectionWrite[];
	conflicts: StageAccountConflict[];
	projections: StateProjection[];
}> {
	const stageLookups = await Promise.all(
		input.projections.map(
			async projection =>
				[
					projection,
					await db.entities.stage
						.get({
							appName: projection.appName,
							stageName: projection.stageName
						})
						.go({ consistent: true })
				] as const
		)
	);
	const { conflicts, projections } = partitionStageOwnership(
		input.accountId,
		stageLookups.map(
			([projection, stage]) => [projection, stage.data] as const
		)
	);
	const desiredApps = new Set(projections.map(state => state.appName));
	const desiredResources = new Set(
		projections.flatMap(state =>
			state.resources.map(resource =>
				resourceKey(state.appName, state.stageName, resource.resourceId)
			)
		)
	);

	const stagesToRead = new Map<
		string,
		{ appName: string; stageName: string }
	>();
	for (const projection of projections)
		stagesToRead.set(
			stageKey(projection.appName, projection.stageName),
			projection
		);
	const resourceResults = await Promise.all(
		[...stagesToRead.values()].map(stage =>
			db.entities.resource.query
				.resource({
					appName: stage.appName,
					stageName: stage.stageName
				})
				.go({ pages: "all" })
		)
	);
	const resources = resourceResults.flatMap(result => result.data);

	const writes: ProjectionWrite[] = [];
	for (const appName of desiredApps)
		writes.push({ kind: "app", appName, now: input.now });
	for (const state of projections) {
		writes.push({
			kind: "stage",
			appName: state.appName,
			stageName: state.stageName,
			now: input.now
		});
		for (const resource of state.resources) {
			writes.push({
				kind: "resource",
				appName: state.appName,
				stageName: state.stageName,
				resource,
				now: input.now
			});
		}
		writes.push({
			kind: "state",
			appName: state.appName,
			stageName: state.stageName,
			sourceBucket: input.stateBucket,
			sourceKey: state.key,
			sourceVersion: state.sourceVersion,
			observedAt: state.sourceUpdatedAt
		});
	}

	for (const resource of resources) {
		if (
			desiredResources.has(
				resourceKey(
					resource.appName,
					resource.stageName,
					resource.resourceId
				)
			)
		)
			continue;
		writes.push({
			kind: "deleteResource",
			appName: resource.appName,
			stageName: resource.stageName,
			resourceId: resource.resourceId
		});
	}
	return {
		writes,
		conflicts,
		projections
	};
}

// TODO: This needs comments and docs about what it's doing and why. Possible that chunkWrite can be made generic like chunkArray in util/chunk.ts?
export function chunkWrites(writes: ProjectionWrite[]): ProjectionWrite[][] {
	const chunks: ProjectionWrite[][] = [];
	let chunk: ProjectionWrite[] = [];
	let bytes = 0;
	for (const write of writes) {
		const writeBytes = Buffer.byteLength(JSON.stringify(write));
		if (writeBytes > maxTransactionBytes) {
			throw stateErrors.projectionTooLarge();
		}
		if (
			chunk.length === maxTransactionActions ||
			bytes + writeBytes > maxTransactionBytes
		) {
			chunks.push(chunk);
			chunk = [];
			bytes = 0;
		}
		chunk.push(write);
		bytes += writeBytes;
	}
	if (chunk.length > 0) chunks.push(chunk);
	return chunks;
}

// TODO: Comments + possible shared helper for DDB chunk writing?
export async function writeChunk(
	accountId: string,
	region: string,
	writes: ProjectionWrite[]
) {
	const transaction = await db.transaction
		.write(({ app, resource, stage, state }) =>
			writes.map(write => {
				switch (write.kind) {
					case "app":
						return app
							.upsert({
								appName: write.appName,
								updatedAt: write.now
							})
							.ifNotExists({ createdAt: write.now })
							.commit();
					case "stage":
						return stage
							.upsert({
								accountId,
								region,
								appName: write.appName,
								stageName: write.stageName,
								updatedAt: write.now
							})
							.ifNotExists({ createdAt: write.now })
							.where(
								(attributes, operations) =>
									`${operations.notExists(attributes.accountId)} OR ${operations.eq(attributes.accountId, accountId)}`
							)
							.commit();
					case "resource":
						return resource
							.upsert({
								accountId,
								appName: write.appName,
								stageName: write.stageName,
								resourceId: write.resource.resourceId,
								parentResourceId:
									write.resource.parentResourceId,
								resourceKind: write.resource.resourceKind,
								resourceType: write.resource.resourceType,
								urn: write.resource.urn,
								normalizedArn: write.resource.normalizedArn,
								name: write.resource.name,
								summary: write.resource.summary,
								updatedAt: write.now
							})
							.ifNotExists({ createdAt: write.now })
							.commit();
					case "state":
						return state
							.upsert({
								accountId,
								appName: write.appName,
								stageName: write.stageName,
								sourceBucket: write.sourceBucket,
								sourceKey: write.sourceKey,
								sourceVersion: write.sourceVersion,
								observedAt: write.observedAt
							})
							.commit();
					case "deleteResource":
						return resource
							.delete({
								appName: write.appName,
								stageName: write.stageName,
								resourceId: write.resourceId
							})
							.commit();
				}
			})
		)
		.go();
	if (transaction.canceled) {
		throw stateErrors.syncPersistenceFailed(
			"Unable to persist SST state projections"
		);
	}
}

// TODO: High level comments
async function removeEmptyApps(appNames: string[]) {
	for (const appName of new Set(appNames)) {
		const stages = await db.entities.stage.query
			.stage({ appName })
			.go({ limit: 1 });
		if (stages.data.length > 0) continue;
		await db.entities.app.delete({ appName }).go({ response: "none" });
	}
}

// TODO: Add high level comments
/** Caller supplies the complete policy-selected list after all required syncs succeed. */
export async function cleanupStale(input: {
	accountId: string;
	stages: Array<{ appName: string; stageName: string }>;
}) {
	const desired = new Set(
		input.stages.map(stage => `${stage.appName}\u0000${stage.stageName}`)
	);
	const existing = await db.entities.stage.query
		.byAwsAccount({ accountId: input.accountId })
		.go({ pages: "all" });
	for (const stage of existing.data) {
		if (!desired.has(`${stage.appName}\u0000${stage.stageName}`))
			await removeStateProjection({
				accountId: input.accountId,
				appName: stage.appName,
				stageName: stage.stageName
			});
	}
}

/** Removes account projections on disconnect without changing Stage monitoring behavior. */
export async function removeAccountProjections(accountId: string) {
	const [stages, discoveredStages] = await Promise.all([
		db.entities.stage.query
			.byAwsAccount({ accountId })
			.go({ pages: "all" }),
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
	// Keep Stages available for retry if history cleanup fails.
	await Promise.all(
		stages.data.map(stage =>
			removeStageHistory({
				appName: stage.appName,
				stageName: stage.stageName
			})
		)
	);
	await deleteStages(stages.data);
	await deleteDiscoveredStages(discoveredStages.data);
	await removeEmptyApps(stages.data.map(stage => stage.appName));
}

// TODO: Add high level comments
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
			throw stateErrors.projectionRemovalFailed(
				"Unable to remove account resource projections"
			);
	}
}

// TODO: Add high level comments
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
			throw stateErrors.projectionRemovalFailed(
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
			throw stateErrors.projectionRemovalFailed(
				"Unable to remove account discovery projections"
			);
	}
}

function stageKey(appName: string, stageName: string): string {
	return `${appName}\u0000${stageName}`;
}

function resourceKey(
	appName: string,
	stageName: string,
	resourceId: string
): string {
	return `${stageKey(appName, stageName)}\u0000${resourceId}`;
}
