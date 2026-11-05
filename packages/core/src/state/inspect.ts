import { AccountIdSchema } from "../util/aws";
import { S3Client } from "@aws-sdk/client-s3";
import { SSMClient } from "@aws-sdk/client-ssm";
import { z } from "zod";

import { stateErrors } from "./errors";
import { fetchState, getBootstrapBucket, redactSstState } from "./sst";
import { stateObjectKey } from "./keys";
import { fn } from "../util/fn";
import * as Account from "../account/account";
import * as Connector from "../account/connector";

// Safe state inventory. It exposes structure required to diagnose
// normalizers, but never raw inputs, outputs, or secret values.
/** Reads a redacted structural inventory of an SST State artifact. */
export const inspectState = fn(
	z.object({
		accountId: AccountIdSchema,
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
		const key = stateObjectKey(appName, stageName);
		const s3 = new S3Client({
			credentials: connection.credentials,
			region: account.region
		});
		const { state } = await fetchState(s3, stateBucket, key);
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
