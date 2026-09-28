import { Service } from "electrodb";
import { Resource } from "sst";

import { dynamo } from "../db/client";
import { connectionEntity } from "./connection.dynamo";
import {
	AccountSyncPolicySchema,
	defaultSyncPolicy,
	parseSyncPolicy,
	type AccountSyncPolicy
} from "../account/policy";

export const connections = new Service(
	{ connection: connectionEntity },
	{ client: dynamo, table: Resource.ConsoleConnections.name }
);

export const upsert = (input: {
	accountId: string;
	region: string;
	roleArn: string;
	createdAt: string;
	updatedAt: string;
}) =>
	connections.entities.connection
		.upsert(input)
		.ifNotExists({ createdAt: input.createdAt })
		.go({ response: "none" });

export const list = async () => {
	const result = await connections.entities.connection.query
		.connection({})
		.go({ pages: "all" });
	return result.data;
};

export const getSyncPolicy = async (
	accountId: string
): Promise<AccountSyncPolicy> => {
	const result = await connections.entities.connection
		.get({ accountId })
		.go({ consistent: true });
	return parseSyncPolicy(result.data?.syncPolicy);
};

export const updateSyncPolicy = async (input: {
	accountId: string;
	policy: AccountSyncPolicy;
	updatedAt: string;
}) => {
	const policy = AccountSyncPolicySchema.parse(input.policy);
	const result = await connections.entities.connection
		.get({ accountId: input.accountId })
		.go({ consistent: true });
	if (!result.data) return null;
	await connections.entities.connection
		.patch({ accountId: input.accountId })
		.set({ syncPolicy: policy, updatedAt: input.updatedAt })
		.go({ response: "none" });
	return policy;
};

export { defaultSyncPolicy };
