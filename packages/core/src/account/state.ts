import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { z } from "zod";

import { db } from "../db";
import { InputError, ServerError } from "../error";
import {
	decodeSstStateBytes,
	parseSstState,
	redactSstState
} from "../state/sst";
import { fn } from "../util/fn";
import * as Connector from "./connector";

// Safe state inventory. It exposes structure required to diagnose
// normalizers, but never raw inputs, outputs, or secret values.
export const inspectState = fn(
	z.object({
		accountId: z.string().regex(/^\d{12}$/),
		appName: z.string().min(1),
		stageName: z.string().min(1)
	}),
	async ({ accountId, appName, stageName }) => {
		const account = await db.entities.account
			.get({ accountId })
			.go({ consistent: true });
		if (!account.data) {
			throw new InputError(
				"account_not_found",
				"Connected account was not found"
			);
		}
		const connection = await Connector.assume({
			roleArn: account.data.roleArn,
			region: account.data.region
		});
		const ssm = new SSMClient({
			credentials: connection.credentials,
			region: account.data.region
		});
		const parameter = await ssm.send(
			new GetParameterCommand({ Name: "/sst/bootstrap" })
		);
		const bootstrap = z
			.object({ state: z.string().min(1) })
			.safeParse(
				parameter.Parameter?.Value
					? JSON.parse(parameter.Parameter.Value)
					: undefined
			);
		if (!bootstrap.success) {
			throw new ServerError(
				"invalid_sst_bootstrap",
				"SST bootstrap metadata does not contain state bucket"
			);
		}
		const key = `app/${appName}/${stageName}.json`;
		const s3 = new S3Client({
			credentials: connection.credentials,
			region: account.data.region
		});
		const object = await s3.send(
			new GetObjectCommand({ Bucket: bootstrap.data.state, Key: key })
		);
		if (!object.Body) {
			throw new ServerError(
				"empty_sst_state",
				"SST state object is empty"
			);
		}
		const state = parseSstState(
			decodeSstStateBytes(
				await object.Body.transformToByteArray(),
				object.ContentEncoding
			)
		);
		const redacted = redactSstState(state) as typeof state;

		return {
			bucket: bootstrap.data.state,
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
