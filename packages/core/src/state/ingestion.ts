import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { z } from "zod";
import { db } from "../db";
import { fn } from "../util/fn";
import { connect, withDisconnectOnAccessFailure } from "../account/access";
import { accountErrors } from "../account/errors";
import * as Connection from "../connection";
import { requestReconcile } from "../issue/monitoring";
import {
	buildWrites,
	chunkWrites,
	isMissingObject,
	loadProjection,
	removeStateProjection,
	writeChunk,
	type StateProjection
} from "../account/sync-projection";
import { decodeSstStateBytes } from "./sst";
import * as Update from "./state.update";

export const sync = fn(
	z.object({
		accountId: z.string().regex(/^\d{12}$/),
		appName: z.string().min(1),
		stageName: z.string().min(1)
	}),
	async ({ accountId, appName, stageName }) => {
		const stateKey = `app/${appName}/${stageName}.json`;
		const state = { appName, stageName, key: stateKey };
		const { account: accountData, connection } = await connect(accountId);
		const stateBucket = accountData.stateBucket;
		if (!stateBucket) throw accountErrors.notFound();
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
			return { accountId, stateKey, status: "missing" as const };
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
			return { accountId, stateKey, status: "excluded" as const };
		}

		const { writes, conflicts } = await buildWrites({
			accountId,
			region: accountData.region,
			stateBucket,
			projections: [projection],
			now
		});
		for (const chunk of chunkWrites(writes))
			await writeChunk(accountId, accountData.region, chunk);
		if (conflicts.length === 0)
			await requestReconcile({ appName, stageName });

		return {
			accountId,
			stateKey,
			conflicts,
			status:
				conflicts.length === 0
					? ("synced" as const)
					: ("conflict" as const)
		};
	}
);

export const receiveUpdate = fn(
	z.object({
		accountId: z.string().regex(/^\d{12}$/),
		appName: z.string().min(1),
		stageName: z.string().min(1),
		updateId: z.string().min(1),
		sequencer: z.string().regex(/^[0-9A-F]{256}$/)
	}),
	async ({ accountId, appName, stageName, updateId, sequencer }) => {
		const stateKey = `update/${appName}/${stageName}/${updateId}.json`;
		const updateKey = { appName, stageName, updateId };
		const { account: accountData, connection } = await connect(accountId);
		const stateBucket = accountData.stateBucket;
		if (!stateBucket) throw accountErrors.notFound();

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
		const update = Update.parseSstUpdate(
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

		const persisted = await Update.upsert({
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
