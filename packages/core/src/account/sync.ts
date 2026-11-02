import {
	GetObjectCommand,
	GetBucketNotificationConfigurationCommand,
	PutBucketNotificationConfigurationCommand,
	S3Client
} from "@aws-sdk/client-s3";
import { z } from "zod";

import { db } from "../db";
import { ServerError } from "../error";
import {
	decodeSstStateBytes,
	normalizeSstState,
	parseSstState,
	type NormalizedResource
} from "../state/sst";
import * as State from "../state";
import { fn } from "../util/fn";
import * as Account from "./account";
import * as Connector from "./connector";
import { configureForwarding } from "./forwarding";
import * as Connection from "../connection";
import {
	discover,
	type StateObject,
	withDisconnectOnAccessFailure
} from "./discovery";
import { removeStageMonitoring, requestReconcile } from "../issue/monitoring";
import {
	partitionStageOwnership,
	type StageAccountConflict
} from "./ownership";

const maxTransactionActions = 90;
const maxTransactionBytes = 3 * 1024 * 1024;

type StateProjection = StateObject & {
	resources: NormalizedResource[];
	sourceVersion?: string;
	sourceUpdatedAt: string;
};

type ProjectionWrite =
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
	  }
	| { kind: "deleteStage"; appName: string; stageName: string };

export const sync = fn(
	z.object({
		accountId: z.string().regex(/^\d{12}$/)
	}),
	async ({ accountId }) => {
		const discovery = await discover(accountId);
		await Account.update({
			accountId,
			stateBucket: discovery.stateBucket,
			updatedAt: new Date().toISOString()
		});
		await enableStateEvents(
			new S3Client({
				credentials: discovery.credentials,
				region: discovery.region
			}),
			discovery.stateBucket
		);
		const busArn = process.env.SST_CONSOLE_BUS_ARN;
		if (!busArn)
			throw new ServerError(
				"missing_bus_arn",
				"Console event bus ARN is not configured"
			);
		await withDisconnectOnAccessFailure(accountId, () =>
			configureForwarding({
				accountId,
				roleArn: discovery.roleArn,
				region: discovery.region,
				credentials: discovery.credentials,
				bucket: discovery.stateBucket,
				busArn
			})
		);
		const policy = await Connection.getSyncPolicy(accountId);
		const stateObjects = discovery.states.filter(state =>
			Connection.Policy.includesStage(policy, state)
		);
		const connection = discovery;
		const { region, roleArn } = discovery;
		const s3 = new S3Client({
			credentials: connection.credentials,
			region
		});
		// 2. Fetch, decompress, parse, redact, and normalize every object before
		// any DynamoDB write. A failed read therefore cannot delete projections.
		const projections = await withDisconnectOnAccessFailure(accountId, () =>
			mapWithConcurrency(stateObjects, 8, state =>
				loadProjection(s3, discovery.stateBucket, state)
			)
		);

		const now = new Date().toISOString();
		const syncRunId = crypto.randomUUID();
		// 3. Build desired projections, then find persisted resources, stages, and
		// apps missing from complete discovery output.
		const {
			writes,
			staleAppNames,
			conflicts,
			projections: acceptedProjections
		} = await buildWrites({
			accountId,
			region,
			stateBucket: discovery.stateBucket,
			projections,
			now,
			completeDiscovery: true
		});
		for (const write of writes)
			if (write.kind === "deleteStage") {
				await removeStageMonitoring({
					appName: write.appName,
					stageName: write.stageName
				});
			}
		// 4. Desired upserts precede stale deletes. Chunks stay under DynamoDB
		// transaction limits; later syncs repair a partially completed run.
		for (const chunk of chunkWrites(writes)) {
			for (const write of chunk)
				if (write.kind === "deleteStage")
					await State.removeStageHistory(write);
			await writeChunk(accountId, region, chunk);
		}
		await removeEmptyApps(staleAppNames);

		// 5. Account freshness and successful run marker update only after all
		// projection chunks have committed.
		const reverseTimestamp = reverseTimestampFor(now);
		const transaction = await db.transaction
			.write(({ account, syncRun }) => [
				account
					.patch({ accountId })
					.set({
						status: "connected",
						stateBucket: discovery.stateBucket,
						lastSyncedAt: now,
						lastSyncConflicts: conflicts,
						updatedAt: now
					})
					.commit(),
				syncRun
					.create({
						accountId,
						syncRunId,
						reverseTimestamp,
						status:
							conflicts.length === 0
								? "succeeded"
								: "completed_with_conflicts",
						startedAt: now,
						completedAt: now,
						stateCount: acceptedProjections.length,
						conflicts
					})
					.commit()
			])
			.go();
		if (transaction.canceled) {
			throw new ServerError(
				"sync_persistence_failed",
				"Unable to persist account sync result"
			);
		}
		for (const projection of acceptedProjections)
			await requestReconcile({
				appName: projection.appName,
				stageName: projection.stageName
			});

		return {
			accountId,
			arn: discovery.arn,
			region,
			roleArn,
			stateBucket: discovery.stateBucket,
			states: discovery.states.map(
				({ appName, stageName, key, lastModified, size }) => ({
					app: appName,
					stage: stageName,
					key,
					lastModified,
					size
				})
			),
			statesTruncated: false,
			skippedStages: conflicts
		};
	}
);

export const refreshDiscovery = fn(
	z.object({ accountId: z.string().regex(/^\d{12}$/) }),
	async ({ accountId }) => {
		const result = await discover(accountId);
		return {
			accountId,
			stateBucket: result.stateBucket,
			states: result.states.map(state => ({
				app: state.appName,
				stage: state.stageName,
				key: state.key,
				lastModified: state.lastModified,
				size: state.size
			}))
		};
	}
);

export const syncStateObject = fn(
	z.object({
		accountId: z.string().regex(/^\d{12}$/),
		stateBucket: z.string().min(1),
		stateKey: z.string().min(1),
		onMissing: z.enum(["remove", "ignore"]).default("remove")
	}),
	async ({ accountId, stateBucket, stateKey, onMissing }) => {
		const state = parseStateKey(stateKey);
		if (!state) return { accountId, stateKey, status: "ignored" as const };

		const accountData = await Account.find({ accountId });
		if (
			accountData?.status !== "connected" ||
			accountData.stateBucket !== stateBucket
		)
			return { accountId, stateKey, status: "ignored" as const };

		const connection = await withDisconnectOnAccessFailure(accountId, () =>
			Connector.assume({
				roleArn: accountData.roleArn,
				region: accountData.region
			})
		);
		const s3 = new S3Client({
			credentials: connection.credentials,
			region: accountData.region
		});
		const now = new Date().toISOString();
		const policy = await Connection.getSyncPolicy(accountId);

		let projection: StateProjection;
		try {
			projection = await withDisconnectOnAccessFailure(accountId, () =>
				loadProjection(s3, stateBucket, state)
			);
		} catch (error) {
			if (!isMissingObject(error)) throw error;
			if (onMissing === "ignore") {
				console.log("Current State not found during refresh", {
					accountId,
					stateKey
				});
				return { accountId, stateKey, status: "ignored" as const };
			}
			await removeDiscoveredStage({ accountId, ...state });
			await removeStateProjection({ accountId, ...state });
			return { accountId, stateKey, status: "removed" as const };
		}

		await db.entities.discoveredStage
			.upsert({
				accountId,
				appName: state.appName,
				stageName: state.stageName,
				stateBucket,
				stateKey,
				lastModified: projection.sourceUpdatedAt,
				discoveredAt: now
			})
			.go({ response: "none" });

		if (!Connection.Policy.includesStage(policy, state)) {
			await removeStateProjection({ accountId, ...state });
			return { accountId, stateKey, status: "ignored" as const };
		}

		const { writes, conflicts } = await buildWrites({
			accountId,
			region: accountData.region,
			stateBucket,
			projections: [projection],
			now,
			completeDiscovery: false
		});
		for (const chunk of chunkWrites(writes))
			await writeChunk(accountId, accountData.region, chunk);
		await Account.update({
			accountId,
			lastSyncedAt: now,
			updatedAt: now,
			lastSyncConflicts: conflicts
		});
		await requestReconcile({
			appName: state.appName,
			stageName: state.stageName
		});

		return {
			accountId,
			stateKey,
			status:
				conflicts.length === 0
					? ("synced" as const)
					: ("conflict" as const)
		};
	}
);

export const syncStateUpdateObject = fn(
	z.object({
		accountId: z.string().regex(/^\d{12}$/),
		stateBucket: z.string().min(1),
		stateKey: z.string().min(1),
		sequencer: z.string().regex(/^[0-9A-F]{256}$/)
	}),
	async ({ accountId, stateBucket, stateKey, sequencer }) => {
		const updateKey = State.Update.parseObjectKey(stateKey);
		if (!updateKey)
			return { accountId, stateKey, status: "ignored" as const };

		const accountData = await Account.find({ accountId });
		if (
			accountData?.status !== "connected" ||
			accountData.stateBucket !== stateBucket
		)
			return { accountId, stateKey, status: "ignored" as const };

		const policy = await Connection.getSyncPolicy(accountId);
		if (!Connection.Policy.includesStage(policy, updateKey))
			return { accountId, stateKey, status: "ignored" as const };

		const stage = await db.entities.stage
			.get({
				appName: updateKey.appName,
				stageName: updateKey.stageName
			})
			.go({ consistent: true });
		if (stage.data && stage.data.accountId !== accountId)
			return { accountId, stateKey, status: "ignored" as const };

		const connection = await withDisconnectOnAccessFailure(accountId, () =>
			Connector.assume({
				roleArn: accountData.roleArn,
				region: accountData.region
			})
		);
		const s3 = new S3Client({
			credentials: connection.credentials,
			region: accountData.region
		});

		let object;
		try {
			object = await withDisconnectOnAccessFailure(accountId, () =>
				s3.send(
					new GetObjectCommand({ Bucket: stateBucket, Key: stateKey })
				)
			);
		} catch (error) {
			if (isMissingObject(error))
				return { accountId, stateKey, status: "ignored" as const };
			throw error;
		}
		if (!object.Body)
			return { accountId, stateKey, status: "ignored" as const };

		const bytes = await object.Body.transformToByteArray();
		const update = State.Update.parseSstUpdate(
			new TextDecoder().decode(
				decodeSstStateBytes(bytes, object.ContentEncoding)
			)
		);
		if (!update || update.updateId !== updateKey.updateId)
			return { accountId, stateKey, status: "ignored" as const };
		const { updateId: _, ...updateInput } = update;
		if (!stage.data) {
			const now = new Date().toISOString();
			await writeChunk(accountId, accountData.region, [
				{ kind: "app", appName: updateKey.appName, now },
				{
					kind: "stage",
					appName: updateKey.appName,
					stageName: updateKey.stageName,
					now
				}
			]);
		}

		const persisted = await State.Update.upsert({
			accountId,
			appName: updateKey.appName,
			stageName: updateKey.stageName,
			updateId: updateKey.updateId,
			sourceBucket: stateBucket,
			sourceKey: stateKey,
			sequencer,
			...(object.VersionId ? { sourceVersion: object.VersionId } : {}),
			observedAt: new Date().toISOString(),
			...updateInput
		});

		return {
			accountId,
			stateKey,
			status: persisted ? ("synced" as const) : ("ignored" as const)
		};
	}
);

async function enableStateEvents(s3: S3Client, bucket: string): Promise<void> {
	const existing = await s3.send(
		new GetBucketNotificationConfigurationCommand({ Bucket: bucket })
	);
	await s3.send(
		new PutBucketNotificationConfigurationCommand({
			Bucket: bucket,
			NotificationConfiguration: {
				EventBridgeConfiguration: {},
				LambdaFunctionConfigurations:
					existing.LambdaFunctionConfigurations,
				QueueConfigurations: existing.QueueConfigurations,
				TopicConfigurations: existing.TopicConfigurations
			}
		})
	);
}

async function loadProjection(
	s3: S3Client,
	bucket: string,
	state: StateObject
): Promise<StateProjection> {
	const object = await s3.send(
		new GetObjectCommand({ Bucket: bucket, Key: state.key })
	);
	if (!object.Body) {
		throw new ServerError("empty_sst_state", "SST state object is empty");
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

function parseStateKey(key: string): StateObject | undefined {
	const match = /^app\/([^/]+)\/(.+)\.json$/.exec(key);
	if (!match) return;
	return { appName: match[1]!, stageName: match[2]!, key };
}

function isMissingObject(error: unknown): boolean {
	if (typeof error !== "object" || error === null) return false;
	const awsError = error as {
		name?: unknown;
		$metadata?: { httpStatusCode?: unknown };
	};
	return (
		awsError.name === "NoSuchKey" ||
		awsError.name === "NotFound" ||
		awsError.$metadata?.httpStatusCode === 404
	);
}

async function removeStateProjection(input: {
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
			throw new ServerError(
				"sync_persistence_failed",
				"Unable to remove SST state projections"
			);
	}
	await State.removeStageHistory(input);
	await db.entities.stage
		.delete({ appName: input.appName, stageName: input.stageName })
		.go({ response: "none" });
	await removeEmptyApps([input.appName]);
}

async function removeDiscoveredStage(input: {
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

async function buildWrites(input: {
	accountId: string;
	region: string;
	stateBucket: string;
	projections: StateProjection[];
	now: string;
	completeDiscovery: boolean;
}): Promise<{
	writes: ProjectionWrite[];
	staleAppNames: string[];
	conflicts: StageAccountConflict[];
	projections: StateProjection[];
}> {
	const [existingStages, stageLookups] = await Promise.all([
		db.entities.stage.query
			.byAwsAccount({ accountId: input.accountId })
			.go({ pages: "all" }),
		Promise.all(
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
		)
	]);
	const { conflicts, projections } = partitionStageOwnership(
		input.accountId,
		stageLookups.map(
			([projection, stage]) => [projection, stage.data] as const
		)
	);
	const desiredApps = new Set(projections.map(state => state.appName));
	const desiredStages = new Set(
		projections.map(state => stageKey(state.appName, state.stageName))
	);
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
	if (input.completeDiscovery)
		for (const stage of existingStages.data)
			stagesToRead.set(stageKey(stage.appName, stage.stageName), stage);
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
	if (input.completeDiscovery)
		for (const stage of existingStages.data) {
			if (desiredStages.has(stageKey(stage.appName, stage.stageName)))
				continue;
			writes.push({
				kind: "deleteStage",
				appName: stage.appName,
				stageName: stage.stageName
			});
		}
	return {
		writes,
		conflicts,
		projections,
		staleAppNames: input.completeDiscovery
			? [
					...new Set(
						existingStages.data
							.filter(stage => !desiredApps.has(stage.appName))
							.map(stage => stage.appName)
					)
				]
			: []
	};
}

function chunkWrites(writes: ProjectionWrite[]): ProjectionWrite[][] {
	const chunks: ProjectionWrite[][] = [];
	let chunk: ProjectionWrite[] = [];
	let bytes = 0;
	for (const write of writes) {
		const writeBytes = Buffer.byteLength(JSON.stringify(write));
		if (writeBytes > maxTransactionBytes) {
			throw new ServerError(
				"state_projection_too_large",
				"SST state projection exceeds DynamoDB transaction limits"
			);
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

async function writeChunk(
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
					case "deleteStage":
						return stage
							.delete({
								appName: write.appName,
								stageName: write.stageName
							})
							.commit();
				}
			})
		)
		.go();
	if (transaction.canceled) {
		throw new ServerError(
			"sync_persistence_failed",
			"Unable to persist SST state projections"
		);
	}
}

async function removeEmptyApps(appNames: string[]) {
	for (const appName of appNames) {
		const stages = await db.entities.stage.query
			.stage({ appName })
			.go({ limit: 1 });
		if (stages.data.length > 0) continue;
		await db.entities.app.delete({ appName }).go({ response: "none" });
	}
}

async function mapWithConcurrency<Input, Output>(
	items: Input[],
	concurrency: number,
	callback: (item: Input) => Promise<Output>
): Promise<Output[]> {
	const results: Output[] = [];
	let index = 0;
	const worker = async () => {
		while (index < items.length) {
			const item = items[index++];
			if (item === undefined) return;
			results.push(await callback(item));
		}
	};
	await Promise.all(
		Array.from({ length: Math.min(concurrency, items.length) }, worker)
	);
	return results;
}

function reverseTimestampFor(timestamp: string): string {
	const milliseconds = Date.parse(timestamp);
	const value = Number.isNaN(milliseconds) ? Date.now() : milliseconds;
	return String(9_999_999_999_999 - value).padStart(13, "0");
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

function chunkArray<T>(items: T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let index = 0; index < items.length; index += size)
		chunks.push(items.slice(index, index + size));
	return chunks;
}
