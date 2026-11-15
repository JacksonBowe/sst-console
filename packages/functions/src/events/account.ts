import * as Account from "@console/core/account";
import { bus } from "sst/aws/bus";

export const handler = bus.subscriber(
	[Account.Registration.Events.Connected],
	async event => {
		switch (event.type) {
			case Account.Registration.Events.Connected.type: {
				const { accountId } = event.properties;
				console.log("Account connection sync started", { accountId });

				const result = await Account.Sync.sync({ accountId });
				console.log("Account connection sync complete", {
					accountId,
					stateCount: result.states.length
				});
				return;
			}
		}
	}
);
