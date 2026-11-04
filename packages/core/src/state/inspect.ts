import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { SSMClient } from "@aws-sdk/client-ssm";
import { z } from "zod";

import { stateErrors } from "./errors";
import {
	decodeSstStateBytes,
	getBootstrapBucket,
	parseSstState,
	redactSstState
} from "./sst";
import { fn } from "../util/fn";
import * as Account from "../account/account";
import * as Connector from "../account/connector";

// TODO: This needs for docs/comments about what it's doing
// Safe state inventory. It exposes structure required to diagnose
// normalizers, but never raw inputs, outputs, or secret values.
export const inspectState = fn(
	z.object({
		accountId: z.string().regex(/^\d{12}$/),
		appName: z.string().min(1),
		stageName: z.string().min(1)
	}),
	async ({ accountId, appName, stageName }) => {
		const account = await Account.get({ accountId });
		const connection = await Connector.assume({
			roleArn: account.roleArn,
			region: account.region
		});
		const ssm = new SSMClient({
			credentials: connection.credentials,
			region: account.region
		});
		const stateBucket = await getBootstrapBucket(ssm);
		if (!stateBucket) throw stateErrors.invalidBootstrap();
		const key = `app/${appName}/${stageName}.json`;
		const s3 = new S3Client({
			credentials: connection.credentials,
			region: account.region
		});
		const object = await s3.send(
			new GetObjectCommand({ Bucket: stateBucket, Key: key })
		);
		if (!object.Body) {
			throw stateErrors.empty();
		}
		const state = parseSstState(
			decodeSstStateBytes(
				await object.Body.transformToByteArray(),
				object.ContentEncoding
			)
		);
		const redacted = redactSstState(state) as typeof state;

		return {
			bucket: stateBucket,
			key,
			resourceCount: redacted.checkpoint.latest.resources.length,
			resources: redacted.checkpoint.latest.resources.map(resource => ({
				type: resource.type,
				urn: resource.urn,
				parent: resource.parent,
				inputKeys: Object.keys(resource.inputs),
				outputKeys: Object.keys(resource.outputs)
			}))
		};
	}
);
