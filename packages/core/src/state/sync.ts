import {
	GetObjectCommand,
	HeadObjectCommand,
	S3Client
} from "@aws-sdk/client-s3";
import { z } from "zod";
import { db } from "../db";
import { fn } from "../util/fn";
import { connect } from "../account/connector";
import { accountErrors } from "../account/errors";
import * as Account from "../account/account";
import * as Connection from "../connection";
import { requestReconcile } from "../issue/monitoring";
import {
	loadProjection,
	removeDiscoveredStage,
	requestProjectionRemoval,
	type StateProjection
} from "./projection";
import { reconcile } from "../app/projection";
import * as Stage from "../app/app.stage";
import * as CurrentState from "./state";
import { decodeSstStateBytes, parseStateKey } from "./sst";
import { isMissingObject } from "../util/s3";
import * as Update from "./update";
import * as StageUpdate from "./state.update";

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
			projection = await loadProjection(s3, stateBucket, state);
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
			await requestProjectionRemoval({ accountId, ...state });
			return { accountId, stateKey, status: "scheduled" as const };
		}

		const { conflicts, projections } = await reconcile({
			accountId,
			region: accountData.region,
			projections: [projection],
			now
		});
		for (const item of projections)
			await CurrentState.upsert({
				accountId,
				appName: item.appName,
				stageName: item.stageName,
				sourceBucket: stateBucket,
				sourceKey: item.key,
				...(item.sourceVersion
					? { sourceVersion: item.sourceVersion }
					: {}),
				observedAt: item.sourceUpdatedAt
			});
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

/** Reconciles a direct app/ deletion without trusting the event's ordering. */
export const handleStateDeletion = fn(
	z.object({
		accountId: z.string().regex(/^\d{12}$/),
		stateBucket: z.string().min(1),
		stateKey: z.string().min(1)
	}),
	async input => {
		const state = parseStateKey(input.stateKey);
		if (!state) return { ...input, status: "ignored" as const };
		const account = await Account.find({ accountId: input.accountId });
		if (
			account?.status !== "connected" ||
			account.stateBucket !== input.stateBucket
		)
			return { ...input, status: "ignored" as const };
		const { connection } = await connect(input.accountId);
		const s3 = new S3Client({
			credentials: connection.credentials,
			region: account.region
		});
		try {
			await s3.send(
				new HeadObjectCommand({
					Bucket: input.stateBucket,
					Key: input.stateKey
				})
			);
		} catch (error) {
			if (!isMissingObject(error)) throw error;
			await removeDiscoveredStage({
				accountId: input.accountId,
				...state
			});
			await requestProjectionRemoval({
				accountId: input.accountId,
				...state
			});
			return { ...input, status: "scheduled" as const };
		}
		return sync({
			accountId: input.accountId,
			appName: state.appName,
			stageName: state.stageName
		});
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
			object = await s3.send(
				new GetObjectCommand({ Bucket: stateBucket, Key: stateKey })
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
			await Stage.upsert({
				accountId,
				region: accountData.region,
				appName,
				stageName,
				now
			});
		}

		const persisted = await StageUpdate.upsert({
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
