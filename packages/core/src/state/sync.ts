import { AccountIdSchema } from "../util/aws";
import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { z } from "zod";
import { fn } from "../util/fn";
import { connect } from "../account/connector";
import { accountErrors } from "../account/errors";
import * as Account from "../account/account";
import * as Connection from "../connection";
import { requestReconcile } from "../issue/monitoring";
import { requestProjectionRemoval } from "./cleanup";
import { reconcile } from "../app/projection";
import * as Stage from "../app/app.stage";
import * as CurrentState from "./state";
import { parseStateKey, stateObjectKey } from "./keys";
import { remove, upsertEntry, type StateObject } from "./discovery";
import { fetchState, normalizeSstState, type NormalizedResource } from "./sst";
import { isMissingObject } from "../util/s3";
import { stateErrors } from "./errors";

/** Syncs current State into discovery, App projections, and State metadata. */
export const sync = fn(
	z.object({
		accountId: AccountIdSchema,
		appName: z.string().min(1),
		stageName: z.string().min(1),
		policy: Connection.AccountSyncPolicySchema
	}),
	async ({ accountId, appName, stageName, policy }) => {
		const stateKey = stateObjectKey(appName, stageName);
		const state = { appName, stageName, key: stateKey };
		const { account: accountData, connection } = await connect(accountId);
		const stateBucket = accountData.stateBucket;
		if (!stateBucket) throw accountErrors.notFound();
		const s3 = new S3Client({
			credentials: connection.credentials,
			region: accountData.region
		});
		const now = new Date().toISOString();
		if (!Connection.Policy.includesStage(policy, state)) {
			await requestProjectionRemoval({ accountId, ...state });
			return { accountId, stateKey, status: "scheduled" as const };
		}
		const stage = await Stage.find(state);
		if (stage && stage.accountId !== accountId)
			return {
				accountId,
				stateKey,
				conflicts: [
					{ appName, stageName, ownerAccountId: stage.accountId }
				],
				status: "conflict" as const
			};

		let projection: StateProjection;
		try {
			projection = await fetchProjection(s3, stateBucket, state);
		} catch (error) {
			if (!isMissingObject(error)) throw error;
			return { accountId, stateKey, status: "missing" as const };
		}

		await upsertEntry({
			accountId,
			appName: state.appName,
			stageName: state.stageName,
			stateBucket,
			stateKey,
			lastModified: projection.sourceUpdatedAt,
			discoveredAt: now
		});

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
		accountId: AccountIdSchema,
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
			await remove({
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
			stageName: state.stageName,
			policy: await Connection.getSyncPolicy(input.accountId)
		});
	}
);

type StateProjection = StateObject & {
	resources: NormalizedResource[];
	sourceVersion?: string;
	sourceUpdatedAt: string;
};

/** Fetches and normalizes one current SST State artifact. */
async function fetchProjection(
	s3: S3Client,
	bucket: string,
	state: StateObject
): Promise<StateProjection> {
	const { state: parsed, sourceVersion } = await fetchState(
		s3,
		bucket,
		state.key
	);
	const timestamp =
		state.lastModified ??
		parsed.checkpoint.latest.manifest?.time ??
		new Date().toISOString();
	if (!z.iso.datetime({ offset: true }).safeParse(timestamp).success)
		throw stateErrors.invalidTimestamp();
	const date = new Date(timestamp);
	if (Number.isNaN(date.getTime())) throw stateErrors.invalidTimestamp();
	const sourceUpdatedAt = date.toISOString();
	return {
		...state,
		resources: normalizeSstState(parsed).resources,
		sourceVersion,
		sourceUpdatedAt
	};
}
