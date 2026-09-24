import {
	DynamoDBClient,
	GetItemCommand,
	UpdateItemCommand
} from "@aws-sdk/client-dynamodb";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { Resource } from "sst";
import { z } from "zod";

import { InputError, ServerError } from "../error";
import { fn } from "../util/fn";
import * as Connector from "./connector";

const dynamo = new DynamoDBClient({});

export const sync = fn(
	z.object({
		accountId: z.string().regex(/^\d{12}$/)
	}),
	async ({ accountId }) => {
		const result = await dynamo.send(
			new GetItemCommand({
				TableName: Resource.Accounts.name,
				Key: {
					accountId: { S: accountId }
				}
			})
		);
		const roleArn = result.Item?.roleArn?.S;
		const region = result.Item?.region?.S;
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
		await dynamo.send(
			new UpdateItemCommand({
				TableName: Resource.Accounts.name,
				Key: {
					accountId: { S: accountId }
				},
				UpdateExpression:
					"SET #status = :status, #stateBucket = :stateBucket, #lastSyncedAt = :now, #updatedAt = :now",
				ExpressionAttributeNames: {
					"#status": "status",
					"#stateBucket": "stateBucket",
					"#lastSyncedAt": "lastSyncedAt",
					"#updatedAt": "updatedAt"
				},
				ExpressionAttributeValues: {
					":status": { S: "connected" },
					":stateBucket": { S: bootstrap.data.state },
					":now": { S: now }
				}
			})
		);

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
