import {
	GetBucketNotificationConfigurationCommand,
	HeadObjectCommand,
	PutBucketNotificationConfigurationCommand,
	S3Client
} from "@aws-sdk/client-s3";
import { z } from "zod";
import * as Connection from "../connection";
import { db } from "../db";
import { ServerError } from "../error";
import * as State from "../state";
import { fn } from "../util/fn";
import * as Account from "./account";
import { connect, withDisconnectOnAccessFailure } from "./access";
import { configureForwarding } from "./forwarding";
import type { StageAccountConflict } from "./ownership";
import {
	isMissingObject,
	parseStateKey,
	removeDiscoveredStage,
	removeStateProjection
} from "./sync-projection";

export const sync = fn(
	z.object({ accountId: z.string().regex(/^\d{12}$/) }),
	async ({ accountId }) => {
		const discovery = await State.discover(accountId);
		const { account, connection } = await connect(accountId);
		await Account.update({
			accountId,
			stateBucket: discovery.stateBucket,
			updatedAt: new Date().toISOString()
		});
		const s3 = new S3Client({
			credentials: connection.credentials,
			region: account.region
		});
		await withDisconnectOnAccessFailure(accountId, async () => {
			const existing = await s3.send(
				new GetBucketNotificationConfigurationCommand({
					Bucket: discovery.stateBucket
				})
			);
			await s3.send(
				new PutBucketNotificationConfigurationCommand({
					Bucket: discovery.stateBucket,
					NotificationConfiguration: {
						EventBridgeConfiguration: {},
						LambdaFunctionConfigurations:
							existing.LambdaFunctionConfigurations,
						QueueConfigurations: existing.QueueConfigurations,
						TopicConfigurations: existing.TopicConfigurations
					}
				})
			);
			const busArn = process.env.SST_CONSOLE_BUS_ARN;
			if (!busArn)
				throw new ServerError(
					"missing_bus_arn",
					"Console event bus ARN is not configured"
				);
			await configureForwarding({
				accountId,
				roleArn: account.roleArn,
				region: account.region,
				credentials: connection.credentials,
				bucket: discovery.stateBucket,
				busArn
			});
		});
		const policy = await Connection.getSyncPolicy(accountId);
		const selected = discovery.states.filter(state =>
			Connection.Policy.includesStage(policy, state)
		);
		const conflicts: StageAccountConflict[] = [];
		for (const state of selected) {
			const result = await State.sync({
				accountId,
				appName: state.appName,
				stageName: state.stageName
			});
			if (result.status === "missing")
				throw new ServerError(
					"missing_sst_state",
					"Discovered SST state is no longer available"
				);
			if (result.status === "conflict")
				conflicts.push(...result.conflicts);
		}
		// Only a complete discovery and successful required Stage syncs authorize cleanup.
		// TODO: Coordinate concurrent syncs and policy changes; define cleanup and monitoring failure outcomes.
		const desired = new Set(
			selected.map(state => `${state.appName}\u0000${state.stageName}`)
		);
		const existing = await db.entities.stage.query
			.byAwsAccount({ accountId })
			.go({ pages: "all" });
		for (const stage of existing.data) {
			if (!desired.has(`${stage.appName}\u0000${stage.stageName}`))
				await removeStateProjection({
					accountId,
					appName: stage.appName,
					stageName: stage.stageName
				});
		}
		await Account.update({
			accountId,
			status: "connected",
			lastSyncConflicts: conflicts,
			updatedAt: new Date().toISOString()
		});
		return { ...discovery, skippedStages: conflicts };
	}
);

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
			await withDisconnectOnAccessFailure(input.accountId, () =>
				s3.send(
					new HeadObjectCommand({
						Bucket: input.stateBucket,
						Key: input.stateKey
					})
				)
			);
		} catch (error) {
			if (!isMissingObject(error)) throw error;
			await removeDiscoveredStage({
				accountId: input.accountId,
				...state
			});
			await removeStateProjection({
				accountId: input.accountId,
				...state
			});
			return { ...input, status: "removed" as const };
		}
		return State.sync({
			accountId: input.accountId,
			appName: state.appName,
			stageName: state.stageName
		});
	}
);
