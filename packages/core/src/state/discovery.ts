import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { SSMClient } from "@aws-sdk/client-ssm";

import { db } from "../db";
import { stateErrors } from "./errors";
import { connect } from "../account/connector";
import { chunkArray } from "../util/chunk";
import { getBootstrapBucket, parseStateKey } from "./sst";

const maxTransactionActions = 90;

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

// TODO: Does this need to be here is should it live in a shared helper?
function stageKey(appName: string, stageName: string): string {
	return `${appName}\u0000${stageName}`;
}
