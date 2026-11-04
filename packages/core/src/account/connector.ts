import {
	AssumeRoleCommand,
	GetCallerIdentityCommand,
	STSClient
} from "@aws-sdk/client-sts";
import { Resource } from "sst";
import { bus } from "sst/aws/bus";
import { z } from "zod";

import * as Connection from "../connection";
import { defineEvent } from "../event";
import { fn } from "../util/fn";
import * as Account from "./account";
import { accountErrors, isRemoteAccessFailure } from "./errors";
import { removeAccountProjections } from "../state/projection";
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

/** Marks an Account disconnected on role-assumption authorization failure. */
async function withDisconnectOnAccessFailure<T>(
	accountId: string,
	operation: () => Promise<T>
): Promise<T> {
	try {
		return await operation();
	} catch (error) {
		if (isRemoteAccessFailure(error)) {
			try {
				await Account.update({
					accountId,
					status: "disconnected",
					updatedAt: new Date().toISOString()
				});
			} catch (persistenceError) {
				console.error(
					"Unable to mark account disconnected after access failure",
					{ accountId },
					persistenceError
				);
			}
		}
		throw error;
	}
}

export const assume = fn(ConnectorSchema, async input => {
	const externalId = process.env.SST_CONSOLE_EXTERNAL_ID;
	if (!externalId) {
		throw accountErrors.missingExternalId();
	}

	const assumed = await sts.send(
		new AssumeRoleCommand({
			RoleArn: input.roleArn,
			RoleSessionName: "sst-console-account-sync",
			ExternalId: externalId
		})
	);
	if (!assumed.Credentials) {
		throw accountErrors.missingCredentials();
	}

	const accessKeyId = assumed.Credentials.AccessKeyId;
	const secretAccessKey = assumed.Credentials.SecretAccessKey;
	if (!accessKeyId || !secretAccessKey) {
		throw accountErrors.invalidCredentials();
	}
	const credentials = {
		accessKeyId,
		secretAccessKey,
		sessionToken: assumed.Credentials.SessionToken
	};

	const target = new STSClient({ credentials, region: input.region });
	const identity = await target.send(new GetCallerIdentityCommand({}));
	if (!identity.Account || !identity.Arn) {
		throw accountErrors.invalidTargetIdentity();
	}

	return {
		accountId: identity.Account,
		arn: identity.Arn,
		credentials,
		region: input.region,
		roleArn: input.roleArn
	};
});

/** Connects a registered Workload Account and verifies the assumed identity. */
export async function connect(accountId: string) {
	const account = await Account.find({ accountId });
	if (!account || account.status !== "connected")
		throw accountErrors.notFound();
	const connection = await withDisconnectOnAccessFailure(accountId, () =>
		assume({ roleArn: account.roleArn, region: account.region })
	);
	if (connection.accountId !== accountId)
		throw accountErrors.verificationFailed();
	return { account, connection };
}

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
		throw accountErrors.invalidRoleArn();
	}

	const status =
		input.requestType === "Delete" ? "disconnected" : "connected";
	if (input.requestType !== "Delete") {
		const connection = await verify({
			region: input.region,
			roleArn: input.roleArn
		});
		if (connection.accountId !== input.accountId) {
			throw accountErrors.verificationFailed();
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
