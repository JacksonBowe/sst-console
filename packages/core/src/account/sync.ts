import { createHash } from "node:crypto";

import {
	GetObjectCommand,
	ListObjectsV2Command,
	S3Client
} from "@aws-sdk/client-s3";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { z } from "zod";

import { db } from "../db";
import { ServerError, InputError } from "../error";
import {
	decodeSstStateBytes,
	normalizeSstState,
	parseSstState,
	type NormalizedResource
} from "../state/sst";
import { fn } from "../util/fn";
import * as Connector from "./connector";

const maxTransactionActions = 90;
const maxTransactionBytes = 3 * 1024 * 1024;

type StateObject = {
	appName: string;
	stageName: string;
	key: string;
	lastModified?: string;
	size?: number;
	etag?: string;
};

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
			kind: "snapshot";
			appName: string;
			stageName: string;
			snapshotId: string;
			reverseTimestamp: string;
			sourceBucket: string;
			sourceKey: string;
			sourceVersion?: string;
			createdAt: string;
	  }
	| {
			kind: "deleteResource";
			appName: string;
			stageName: string;
			resourceId: string;
	  }
	| { kind: "deleteStage"; appName: string; stageName: string }
	| { kind: "deleteApp"; appName: string };

export const sync = fn(
	z.object({
		accountId: z.string().regex(/^\d{12}$/)
	}),
	async ({ accountId }) => {
		const account = await db.entities.account
			.get({ accountId })
			.go({ consistent: true });
		const roleArn = account.data?.roleArn;
		const region = account.data?.region;
		if (!roleArn || !region) {
			throw new InputError(
				"account_not_found",
				"Connected account was not found"
			);
		}

		const connection = await Connector.assume({ roleArn, region });
		if (connection.accountId !== accountId) {
			throw new ServerError(
				"account_verification_failed",
				"Connector role does not belong to registered account"
			);
		}

		const ssm = new SSMClient({
			credentials: connection.credentials,
			region
		});
		const bootstrapParameter = await ssm.send(
			new GetParameterCommand({ Name: "/sst/bootstrap" })
		);
		if (!bootstrapParameter.Parameter?.Value) {
			throw new ServerError(
				"missing_sst_bootstrap",
				"SST bootstrap metadata is empty"
			);
		}

		const bootstrap = z
			.object({ state: z.string().min(1) })
			.safeParse(JSON.parse(bootstrapParameter.Parameter.Value));
		if (!bootstrap.success) {
			throw new ServerError(
				"invalid_sst_bootstrap",
				"SST bootstrap metadata does not contain state bucket"
			);
		}

		const s3 = new S3Client({
			credentials: connection.credentials,
			region
		});
		const stateObjects = await listStateObjects(s3, bootstrap.data.state);
		const projections = await mapWithConcurrency(stateObjects, 8, state =>
			loadProjection(s3, bootstrap.data.state, state)
		);

		const now = new Date().toISOString();
		const syncRunId = crypto.randomUUID();
		const writes = await buildWrites({
			accountId,
			stateBucket: bootstrap.data.state,
			projections,
			now
		});
		for (const chunk of chunkWrites(writes)) {
			await writeChunk(accountId, chunk);
		}

		const reverseTimestamp = reverseTimestampFor(now);
		const transaction = await db.transaction
			.write(({ account, syncRun }) => [
				account
					.patch({ accountId })
					.set({
						status: "connected",
						stateBucket: bootstrap.data.state,
						lastSyncedAt: now,
						updatedAt: now
					})
					.commit(),
				syncRun
					.create({
						accountId,
						syncRunId,
						reverseTimestamp,
						status: "succeeded",
						startedAt: now,
						completedAt: now,
						stateCount: projections.length
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

		return {
			accountId,
			arn: connection.arn,
			region,
			roleArn,
			stateBucket: bootstrap.data.state,
			states: stateObjects.map(
				({ appName, stageName, key, lastModified, size }) => ({
					app: appName,
					stage: stageName,
					key,
					lastModified,
					size
				})
			),
			statesTruncated: false
		};
	}
);

async function listStateObjects(
	s3: S3Client,
	bucket: string
): Promise<StateObject[]> {
	const states: StateObject[] = [];
	let continuationToken: string | undefined;
	do {
		const page = await s3.send(
			new ListObjectsV2Command({
				Bucket: bucket,
				Prefix: "app/",
				ContinuationToken: continuationToken
			})
		);
		for (const object of page.Contents ?? []) {
			if (!object.Key) continue;
			const match = /^app\/([^/]+)\/(.+)\.json$/.exec(object.Key);
			if (!match) continue;
			states.push({
				appName: match[1]!,
				stageName: match[2]!,
				key: object.Key,
				lastModified: object.LastModified?.toISOString(),
				size: object.Size,
				etag: object.ETag
			});
		}
		continuationToken = page.NextContinuationToken;
	} while (continuationToken);
	return states;
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

async function buildWrites(input: {
	accountId: string;
	stateBucket: string;
	projections: StateProjection[];
	now: string;
}): Promise<ProjectionWrite[]> {
	const desiredApps = new Set(input.projections.map(state => state.appName));
	const desiredStages = new Set(
		input.projections.map(state => stageKey(state.appName, state.stageName))
	);
	const desiredResources = new Set(
		input.projections.flatMap(state =>
			state.resources.map(resource =>
				resourceKey(state.appName, state.stageName, resource.resourceId)
			)
		)
	);
	const [apps, stages, resources] = await Promise.all([
		db.entities.app.query
			.app({ accountId: input.accountId })
			.go({ pages: "all" }),
		db.entities.stage.query
			.stage({ accountId: input.accountId })
			.go({ pages: "all" }),
		db.entities.resource.query
			.resource({ accountId: input.accountId })
			.go({ pages: "all" })
	]);

	const writes: ProjectionWrite[] = [];
	for (const appName of desiredApps)
		writes.push({ kind: "app", appName, now: input.now });
	for (const state of input.projections) {
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
			kind: "snapshot",
			appName: state.appName,
			stageName: state.stageName,
			snapshotId: snapshotIdFor(state),
			reverseTimestamp: reverseTimestampFor(state.sourceUpdatedAt),
			sourceBucket: input.stateBucket,
			sourceKey: state.key,
			sourceVersion: state.sourceVersion,
			createdAt: state.sourceUpdatedAt
		});
	}

	for (const resource of resources.data) {
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
	for (const stage of stages.data) {
		if (desiredStages.has(stageKey(stage.appName, stage.stageName)))
			continue;
		writes.push({
			kind: "deleteStage",
			appName: stage.appName,
			stageName: stage.stageName
		});
	}
	for (const app of apps.data) {
		if (desiredApps.has(app.appName)) continue;
		writes.push({ kind: "deleteApp", appName: app.appName });
	}
	return writes;
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

async function writeChunk(accountId: string, writes: ProjectionWrite[]) {
	const transaction = await db.transaction
		.write(({ app, resource, stage, stateSnapshot }) =>
			writes.map(write => {
				switch (write.kind) {
					case "app":
						return app
							.upsert({
								accountId,
								appName: write.appName,
								updatedAt: write.now
							})
							.ifNotExists({ createdAt: write.now })
							.commit();
					case "stage":
						return stage
							.upsert({
								accountId,
								appName: write.appName,
								stageName: write.stageName,
								updatedAt: write.now
							})
							.ifNotExists({ createdAt: write.now })
							.commit();
					case "resource":
						return resource
							.upsert({
								accountId,
								appName: write.appName,
								stageName: write.stageName,
								resourceId: write.resource.resourceId,
								resourceType: write.resource.resourceType,
								urn: write.resource.urn,
								normalizedArn: write.resource.normalizedArn,
								name: write.resource.name,
								summary: write.resource.summary,
								updatedAt: write.now
							})
							.ifNotExists({ createdAt: write.now })
							.commit();
					case "snapshot":
						return stateSnapshot
							.upsert({
								accountId,
								appName: write.appName,
								stageName: write.stageName,
								snapshotId: write.snapshotId,
								reverseTimestamp: write.reverseTimestamp,
								sourceBucket: write.sourceBucket,
								sourceKey: write.sourceKey,
								sourceVersion: write.sourceVersion,
								createdAt: write.createdAt
							})
							.commit();
					case "deleteResource":
						return resource
							.delete({
								accountId,
								appName: write.appName,
								stageName: write.stageName,
								resourceId: write.resourceId
							})
							.commit();
					case "deleteStage":
						return stage
							.delete({
								accountId,
								appName: write.appName,
								stageName: write.stageName
							})
							.commit();
					case "deleteApp":
						return app
							.delete({ accountId, appName: write.appName })
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

function snapshotIdFor(state: StateProjection): string {
	return createHash("sha256")
		.update(
			[
				state.key,
				state.sourceVersion ?? state.etag ?? state.sourceUpdatedAt
			].join("#")
		)
		.digest("hex");
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
