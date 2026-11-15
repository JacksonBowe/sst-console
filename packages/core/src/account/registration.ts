import { Resource } from "sst";
import { bus } from "sst/aws/bus";
import { z } from "zod";
import * as Connection from "../connection";
import { defineEvent } from "../event";
import { AccountIdSchema } from "../util/aws";
import { fn } from "../util/fn";
import * as Account from "./account";
import * as Connector from "./connector";
import { accountErrors } from "./errors";
import { removeAccountProjections } from "./projection";
import { ConnectorCallbackSchema, ConnectorRoleArnPattern } from "./schema";

export const Events = {
	Connected: defineEvent(
		"account.connected",
		z.object({ accountId: AccountIdSchema })
	)
};

export type RegisterInput = z.input<typeof ConnectorCallbackSchema>;

export const register = fn(ConnectorCallbackSchema, async input => {
	const roleMatch = ConnectorRoleArnPattern.exec(input.roleArn);
	if (roleMatch?.groups?.accountId !== input.accountId) {
		throw accountErrors.invalidRoleArn();
	}

	const status =
		input.requestType === "Delete" ? "disconnected" : "connected";
	if (input.requestType !== "Delete") {
		const connection = await Connector.verify({
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

	return { accountId: input.accountId, status };
});
