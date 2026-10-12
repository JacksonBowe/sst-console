import {
	AssumeRoleCommand,
	GetCallerIdentityCommand,
	STSClient
} from "@aws-sdk/client-sts";
import { Resource } from "sst";
import { bus } from "sst/aws/bus";
import { z } from "zod";

import * as Connection from "../connection";
import { InputError, ServerError } from "../error";
import { defineEvent } from "../event";
import { fn } from "../util/fn";
import * as Account from "./account";
import { removeAccountProjections } from "./projection";
import {
	ConnectorCallbackSchema,
	ConnectorRoleArnPattern,
	ConnectorSchema
} from "./schema";

const sts = new STSClient({});
export const Events = {
	Connected: defineEvent(
		"account.connected",
		z.object({ accountId: z.string().regex(/^\d{12}$/) })
	)
};

export type RegisterInput = z.input<typeof ConnectorCallbackSchema>;

export const assume = fn(ConnectorSchema, async input => {
	const externalId = process.env.SST_CONSOLE_EXTERNAL_ID;
	if (!externalId) {
		throw new ServerError(
			"missing_external_id",
			"SST Console external ID is not configured"
		);
	}

	const assumed = await sts.send(
		new AssumeRoleCommand({
			RoleArn: input.roleArn,
			RoleSessionName: "sst-console-account-sync",
			ExternalId: externalId
		})
	);
	if (!assumed.Credentials) {
		throw new ServerError(
			"missing_assumed_credentials",
			"AWS did not return target account credentials"
		);
	}

	const accessKeyId = assumed.Credentials.AccessKeyId;
	const secretAccessKey = assumed.Credentials.SecretAccessKey;
	if (!accessKeyId || !secretAccessKey) {
		throw new ServerError(
			"invalid_assumed_credentials",
			"AWS returned incomplete target account credentials"
		);
	}
	const credentials = {
		accessKeyId,
		secretAccessKey,
		sessionToken: assumed.Credentials.SessionToken
	};

	const target = new STSClient({ credentials, region: input.region });
	const identity = await target.send(new GetCallerIdentityCommand({}));
	if (!identity.Account || !identity.Arn) {
		throw new ServerError(
			"invalid_target_identity",
			"AWS did not return target account identity"
		);
	}

	return {
		accountId: identity.Account,
		arn: identity.Arn,
		credentials,
		region: input.region,
		roleArn: input.roleArn
	};
});

export const verify = fn(ConnectorSchema, async input => {
	const connection = await assume(input);

	return {
		accountId: connection.accountId,
		arn: connection.arn,
		region: connection.region,
		roleArn: connection.roleArn
	};
});

export const register = fn(ConnectorCallbackSchema, async input => {
	const roleMatch = ConnectorRoleArnPattern.exec(input.roleArn);
	if (roleMatch?.groups?.accountId !== input.accountId) {
		throw new InputError(
			"invalid_role_arn",
			"Connector role ARN does not belong to supplied account"
		);
	}

	const status =
		input.requestType === "Delete" ? "disconnected" : "connected";
	if (input.requestType !== "Delete") {
		const connection = await verify({
			region: input.region,
			roleArn: input.roleArn
		});
		if (connection.accountId !== input.accountId) {
			throw new ServerError(
				"account_verification_failed",
				"Connector role does not belong to supplied account"
			);
		}
	}

	const now = new Date().toISOString();
	if (input.requestType !== "Delete") {
		await Connection.upsert({
			accountId: input.accountId,
			region: input.region,
			roleArn: input.roleArn,
			createdAt: now,
			updatedAt: now
		});
	} else {
		await removeAccountProjections(input.accountId);
	}
	await Account.create({
		accountId: input.accountId,
		region: input.region,
		roleArn: input.roleArn,
		status,
		createdAt: now,
		updatedAt: now
	});

	if (input.requestType !== "Delete") {
		await bus.publish(Resource.Bus, Events.Connected, {
			accountId: input.accountId
		});
	}

	return {
		accountId: input.accountId,
		status
	};
});
