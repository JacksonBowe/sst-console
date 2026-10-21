import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { z } from "zod";

import { db } from "../db";
import { ServerError } from "../error";
import * as Account from "./account";
import * as Connector from "./connector";
import { accountErrors } from "./errors";

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
	arn: string;
	region: string;
	roleArn: string;
	stateBucket: string;
	states: StateObject[];
};

export async function discover(accountId: string): Promise<
	AccountDiscovery & {
		credentials: Awaited<
			ReturnType<typeof Connector.assume>
		>["credentials"];
	}
> {
	const account = await Account.find({ accountId });
	const roleArn = account?.roleArn;
	const region = account?.region;
	if (!roleArn || !region) throw accountErrors.notFound();

	const connection = await withDisconnectOnAccessFailure(accountId, () =>
		Connector.assume({ roleArn, region })
	);
	if (connection.accountId !== accountId)
		throw accountErrors.verificationFailed();

	const ssm = new SSMClient({ credentials: connection.credentials, region });
	const bootstrapParameter = await withDisconnectOnAccessFailure(
		accountId,
		() => ssm.send(new GetParameterCommand({ Name: "/sst/bootstrap" }))
	);
	if (!bootstrapParameter.Parameter?.Value)
		throw new ServerError(
			"missing_sst_bootstrap",
			"SST bootstrap metadata is empty"
		);
	const bootstrap = z
		.object({ state: z.string().min(1) })
		.safeParse(JSON.parse(bootstrapParameter.Parameter.Value));
	if (!bootstrap.success)
		throw new ServerError(
			"invalid_sst_bootstrap",
			"SST bootstrap metadata does not contain state bucket"
		);

	const s3 = new S3Client({ credentials: connection.credentials, region });
	const states = await withDisconnectOnAccessFailure(accountId, () =>
		listStateObjects(s3, bootstrap.data.state)
	);
	await reconcileDiscovery(accountId, bootstrap.data.state, states);
	return { ...connection, stateBucket: bootstrap.data.state, states };
}

export async function withDisconnectOnAccessFailure<T>(
	accountId: string,
	operation: () => Promise<T>
): Promise<T> {
	try {
		return await operation();
	} catch (error) {
		if (isRemoteAccessFailure(error)) {
			try {
				await Account.update({
					accountId,
					status: "disconnected",
					updatedAt: new Date().toISOString()
				});
			} catch (persistenceError) {
				console.error(
					"Unable to mark account disconnected after access failure",
					{ accountId },
					persistenceError
				);
			}
		}
		throw error;
	}
}

function isRemoteAccessFailure(error: unknown): boolean {
	if (typeof error !== "object" || error === null) return false;
	const awsError = error as {
		name?: unknown;
		$metadata?: { httpStatusCode?: unknown };
	};
	const code = typeof awsError.name === "string" ? awsError.name : "";
	return (
		[
			"AccessDenied",
			"AccessDeniedException",
			"UnauthorizedOperation",
			"NoSuchEntity",
			"NoSuchEntityException",
			"InvalidClientTokenId",
			"UnrecognizedClientException"
		].includes(code) || awsError.$metadata?.httpStatusCode === 403
	);
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
			throw new ServerError(
				"discovery_persistence_failed",
				"Unable to persist discovered SST state entries"
			);
	}
}

function chunkArray<T>(items: T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let index = 0; index < items.length; index += size)
		chunks.push(items.slice(index, index + size));
	return chunks;
}

function stageKey(appName: string, stageName: string): string {
	return `${appName}\u0000${stageName}`;
}
