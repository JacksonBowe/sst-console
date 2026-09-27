import * as Account from "@console/core/account";
import { bus } from "sst/aws/bus";

export const handler = bus.subscriber(
	[Account.Connector.Events.Connected],
	async event => {
		switch (event.type) {
			case Account.Connector.Events.Connected.type: {
				const { accountId } = event.properties;
				console.log("Account connection sync started", { accountId });

				const result = await Account.sync({ accountId });
				console.log("Account connection sync complete", {
					accountId,
					stateCount: result.states.length
				});
				return;
			}
		}
	}
);
