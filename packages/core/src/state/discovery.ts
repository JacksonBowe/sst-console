import { AccountIdSchema } from "../util/aws";
// TODO: Should this entire file live in state.ts?

import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { SSMClient } from "@aws-sdk/client-ssm";

import { db } from "../db";
import { stateErrors } from "./errors";
import { connect } from "../account/connector";
import { chunkArray } from "../util/chunk";
import { getBootstrapBucket } from "./sst";
import { parseStateKey, stageKey } from "./keys";
import { z } from "zod";
import { fn } from "../util/fn";

const maxTransactionActions = 90;

/** Lists account discovery identities for disconnect cleanup. */
export const list = fn(
	z.object({ accountId: AccountIdSchema }),
	async input => {
		const result = await db.entities.discoveredStage.query
			.discovery(input)
			.go({ pages: "all" });
		return result.data.map(({ accountId, appName, stageName }) => ({
			accountId,
			appName,
			stageName
		}));
	}
);

const DiscoveryKeySchema = z.object({
	accountId: AccountIdSchema,
	appName: z.string().min(1),
	stageName: z.string().min(1)
});

/** Removes one or more discovery entries without changing App projections. */
export const remove = fn(
	z.union([DiscoveryKeySchema, z.array(DiscoveryKeySchema)]),
	async input => {
		if (!Array.isArray(input)) {
			await db.entities.discoveredStage
				.delete(input)
				.go({ response: "none" });
			return;
		}
		const stages = input;
		for (const chunk of chunkArray(stages, maxTransactionActions)) {
			const result = await db.transaction
				.write(({ discoveredStage }) =>
					chunk.map(input => discoveredStage.delete(input).commit())
				)
				.go();
			if (result.canceled)
				throw stateErrors.projectionRemovalFailed(
					"Unable to remove account discovery projections"
				);
		}
	}
);

/** Upserts one observed State object in the discovery inventory. */
export async function upsertEntry(input: {
	accountId: string;
	appName: string;
	stageName: string;
	stateBucket: string;
	stateKey: string;
	lastModified: string;
	discoveredAt: string;
}) {
	await db.entities.discoveredStage.upsert(input).go({ response: "none" });
}

export type StateObject = {
	appName: string;
	stageName: string;
	key: string;
	lastModified?: string;
	size?: number;
	etag?: string;
};

type AccountDiscovery = {
	accountId: string;
	stateBucket: string;
	states: StateObject[];
};

/** Discovers current State objects and reconciles the account's inventory. */
export async function discover(accountId: string): Promise<AccountDiscovery> {
	const { account, connection } = await connect(accountId);
	const { region } = account;

	const ssm = new SSMClient({ credentials: connection.credentials, region });
	const stateBucket = await getBootstrapBucket(ssm);
	if (!stateBucket) throw stateErrors.missingBootstrap();

	const s3 = new S3Client({ credentials: connection.credentials, region });
	const states = await listStateObjects(s3, stateBucket);
	await reconcileDiscovery(accountId, stateBucket, states);
	return { accountId, stateBucket, states };
}

/** Lists current State objects and their S3 metadata across all pages. */
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
			const state = parseStateKey(object.Key);
			if (!state) continue;
			states.push({
				...state,
				lastModified: object.LastModified?.toISOString(),
				size: object.Size,
				etag: object.ETag
			});
		}
		continuationToken = page.NextContinuationToken;
	} while (continuationToken);
	return states;
}

/** Updates discovery records to match the complete current object listing. */
async function reconcileDiscovery(
	accountId: string,
	stateBucket: string,
	states: StateObject[]
) {
	const existing = await db.entities.discoveredStage.query
		.discovery({ accountId })
		.go({ pages: "all" });
	const now = new Date().toISOString();
	const desired = new Set(
		states.map(state => stageKey(state.appName, state.stageName))
	);
	const writes = [
		...states.map(state => ({ kind: "upsert" as const, state })),
		...existing.data
			.filter(
				stage => !desired.has(stageKey(stage.appName, stage.stageName))
			)
			.map(stage => ({ kind: "delete" as const, stage }))
	];
	for (const chunk of chunkArray(writes, maxTransactionActions)) {
		const transaction = await db.transaction
			.write(({ discoveredStage }) =>
				chunk.map(write =>
					write.kind === "upsert"
						? discoveredStage
								.upsert({
									accountId,
									appName: write.state.appName,
									stageName: write.state.stageName,
									stateBucket,
									stateKey: write.state.key,
									lastModified: write.state.lastModified,
									size: write.state.size,
									etag: write.state.etag,
									discoveredAt: now
								})
								.commit()
						: discoveredStage
								.delete({
									accountId,
									appName: write.stage.appName,
									stageName: write.stage.stageName
								})
								.commit()
				)
			)
			.go();
		if (transaction.canceled)
			throw stateErrors.discoveryPersistenceFailed();
	}
}
