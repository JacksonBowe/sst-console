import { Service } from "electrodb";
import { Resource } from "sst";

import { dynamo } from "../db/client";
import { connectionEntity } from "./connection.dynamo";

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
