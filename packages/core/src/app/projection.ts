import { AccountIdSchema } from "../util/aws";
import { db } from "../db";
import { appErrors } from "./errors";
import { z } from "zod";
import { fn } from "../util/fn";
import {
	partitionStageOwnership,
	type StageAccountConflict
} from "./ownership";

const maxTransactionActions = 90;
const maxTransactionBytes = 3 * 1024 * 1024;
const resourceSchema = z.object({
	resourceId: z.string().min(1),
	parentResourceId: z.string().optional(),
	resourceKind: z.enum(["component", "physical"]),
	resourceType: z.string(),
	urn: z.string(),
	normalizedArn: z.string().optional(),
	name: z.string(),
	summary: z
		.union([
			z.object({ bucketName: z.string() }),
			z.object({
				functionName: z.string(),
				runtime: z.string().optional(),
				memorySize: z.number().optional(),
				timeout: z.number().optional()
			}),
			z.object({
				tableName: z.string(),
				billingMode: z.string().optional(),
				streamEnabled: z.boolean().optional()
			})
		])
		.optional()
});
const observationSchema = z
	.object({
		appName: z.string().min(1),
		stageName: z.string().min(1),
		key: z.string().min(1),
		sourceVersion: z.string().optional(),
		sourceUpdatedAt: z.string().min(1),
		resources: z.array(resourceSchema)
	})
	.passthrough();

export type ProjectionWrite =
	| { kind: "app"; appName: string; now: string }
	| { kind: "stage"; appName: string; stageName: string; now: string }
	| {
			kind: "resource";
			appName: string;
			stageName: string;
			resource: z.output<typeof resourceSchema>;
			now: string;
			createdAt: string;
	  }
	| {
			kind: "deleteResource";
			appName: string;
			stageName: string;
			resourceId: string;
	  };

/** Builds App writes only for Stages owned by the syncing Workload Account. */
export async function buildWrites(input: {
	accountId: string;
	region: string;
	projections: Array<z.output<typeof observationSchema>>;
	now: string;
}): Promise<{
	writes: ProjectionWrite[];
	conflicts: StageAccountConflict[];
	projections: Array<z.output<typeof observationSchema>>;
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
	const existingResources = new Map(
		resources.map(resource => [
			resourceKey(
				resource.appName,
				resource.stageName,
				resource.resourceId
			),
			resource
		])
	);

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
				now: input.now,
				createdAt:
					existingResources.get(
						resourceKey(
							state.appName,
							state.stageName,
							resource.resourceId
						)
					)?.createdAt ?? input.now
			});
		}
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

/** Bounds transactions by action count and estimated payload size. */
export function chunkWrites(writes: ProjectionWrite[]): ProjectionWrite[][] {
	const chunks: ProjectionWrite[][] = [];
	let chunk: ProjectionWrite[] = [];
	let bytes = 0;
	for (const write of writes) {
		const writeBytes = Buffer.byteLength(JSON.stringify(write));
		if (writeBytes > maxTransactionBytes) {
			throw appErrors.projectionTooLarge();
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

/** Writes a chunk while guarding Stage ownership. */
export async function writeChunk(
	accountId: string,
	region: string,
	writes: ProjectionWrite[]
) {
	const transaction = await db.transaction
		.write(({ app, resource, stage }) =>
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
							.put({
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
								createdAt: write.createdAt,
								updatedAt: write.now
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
		throw appErrors.projectionPersistenceFailed();
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

/** Reconciles a complete current SST observation into App projections. */
export const reconcile = fn(
	z.object({
		accountId: AccountIdSchema,
		region: z.string().min(1),
		projections: z.array(observationSchema),
		now: z.iso.datetime()
	}),
	async input => {
		const result = await buildWrites(input);
		for (const chunk of chunkWrites(result.writes))
			await writeChunk(input.accountId, input.region, chunk);
		return result;
	}
);
