import * as Account from "@console/core/account";
import * as State from "@console/core/state";
import { withActor } from "@console/core/actor";
import { bus } from "sst/aws/bus";

export const handler = bus.subscriber(
	[
		State.Events.UpdateCreated,
		State.Events.SnapshotCreated,
		State.Events.StateUpdated,
		State.Events.EventLogCreated
	],
	async event =>
		withActor({ type: "system", properties: {} }, async () => {
			switch (event.type) {
				case State.Events.UpdateCreated.type:
					console.log(
						"State Update ingestion complete",
						await Account.Sync.syncStateUpdateObject(
							event.properties
						)
					);
					return;
				case State.Events.StateUpdated.type: {
					const { accountId, stateBucket, stateKey } =
						event.properties;
					const match =
						/^snapshot\/([^/]+)\/([^/]+)\/([^/]+)\.json$/.exec(
							stateKey
						);
					if (!match) return;
					console.log(
						"State refresh complete",
						await Account.Sync.syncStateObject({
							accountId,
							stateBucket,
							stateKey: `app/${match[1]}/${match[2]}.json`,
							onMissing: "ignore"
						})
					);
					return;
				}
				case State.Events.SnapshotCreated.type:
					console.log(
						"State Snapshot processing not implemented",
						event.properties
					);
					return;
				case State.Events.EventLogCreated.type:
					console.log(
						"State Event Log processing not implemented",
						event.properties
					);
			}
		})
);
