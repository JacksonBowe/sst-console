import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { z } from "zod";

import { db } from "../db";
import { InputError, ServerError } from "../error";
import { fn } from "../util/fn";
import * as Connector from "./connector";

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
		const stateObjects = await s3.send(
			new ListObjectsV2Command({
				Bucket: bootstrap.data.state,
				Prefix: "app/"
			})
		);
		const states = (stateObjects.Contents ?? []).flatMap(object => {
			if (!object.Key) return [];
			const match = /^app\/([^/]+)\/(.+)\.json$/.exec(object.Key);
			if (!match) return [];

			return [
				{
					app: match[1],
					stage: match[2],
					key: object.Key,
					lastModified: object.LastModified?.toISOString(),
					size: object.Size
				}
			];
		});

		const now = new Date().toISOString();
		const syncRunId = crypto.randomUUID();
		const reverseTimestamp = String(
			9_999_999_999_999 - Date.now()
		).padStart(13, "0");
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
						stateCount: states.length
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
			states,
			statesTruncated: stateObjects.IsTruncated ?? false
		};
	}
);
