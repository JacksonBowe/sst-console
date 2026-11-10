import * as State from "@console/core/state";
import * as Account from "@console/core/account";
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
			const { accountId, stateBucket } = event.properties;
			const account = await Account.find({ accountId });
			if (
				account?.status !== "connected" ||
				account.stateBucket !== stateBucket
			)
				return;
			switch (event.type) {
				case State.Events.UpdateCreated.type: {
					const update = State.Keys.parseUpdateKey(
						event.properties.stateKey
					);
					if (!update) return;
					console.log(
						"State Update ingestion complete",
						await State.Update.receiveUpdate({
							accountId,
							appName: update.appName,
							stageName: update.stageName,
							updateId: update.updateId,
							sequencer: event.properties.sequencer,
							replay: event.properties.historical
						})
					);
					return;
				}
				case State.Events.StateUpdated.type: {
					const { stateKey } = event.properties;
					const match =
						/^snapshot\/([^/]+)\/([^/]+)\/([^/]+)\.json$/.exec(
							stateKey
						);
					if (!match) return;
					console.log(
						"State refresh complete",
						await State.sync({
							accountId,
							appName: match[1]!,
							stageName: match[2]!
						})
					);
					return;
				}
				case State.Events.SnapshotCreated.type:
					console.log(
						"State Snapshot ingestion complete",
						await State.Snapshot.receiveSnapshot(event.properties)
					);
					return;
				case State.Events.EventLogCreated.type:
					console.log(
						"State Event Log ingestion complete",
						await State.EventLog.receiveEventLog(event.properties)
					);
			}
		})
);
