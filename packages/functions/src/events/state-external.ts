import * as State from "@console/core/state";
import { withActor } from "@console/core/actor";
import { Resource } from "sst";
import { bus } from "sst/aws/bus";

type S3StateEvent = {
	account?: string;
	"detail-type"?: string;
	detail?: {
		bucket?: { name?: string };
		object?: { key?: string; sequencer?: string };
	};
};

export async function handler(event: S3StateEvent): Promise<void> {
	// TODO: Verify event provenance against spoofing before the next release.
	const accountId = event.account;
	const stateBucket = event.detail?.bucket?.name;
	const stateKey = event.detail?.object?.key;
	if (!accountId || !/^\d{12}$/.test(accountId) || !stateBucket || !stateKey)
		return;

	const input = { accountId, stateBucket, stateKey };
	await withActor({ type: "system", properties: {} }, async () => {
		// Stage deletion still uses the existing direct path until its lifecycle is reviewed.
		if (
			event["detail-type"] === "Object Deleted" &&
			stateKey.startsWith("app/")
		) {
			// TODO: Move Stage deletion to the State event consumer when its lifecycle is reviewed.
			console.log(
				"State object reconciliation complete",
				await State.handleStateDeletion(input)
			);
			return;
		}
		if (event["detail-type"] !== "Object Created") return;

		// Created artifacts become internal State events; processing happens in state.ts.
		// app/ creation is ignored because snapshot creation triggers the refresh.
		// TODO: Investigate checking PutEvents failed entries so publication failures
		// throw and trigger retries instead of silently losing State events.
		if (stateKey.startsWith("update/")) {
			// The sequencer prevents older deliveries overwriting a newer Update.
			const sequencer = State.Update.normalizeSequencer(
				event.detail?.object?.sequencer
			);
			if (!sequencer) {
				console.warn(
					"Ignoring S3 update event without a valid sequencer"
				);
				return;
			}
			await bus.publish(Resource.Bus, State.Events.UpdateCreated, {
				...input,
				sequencer
			});
		} else if (stateKey.startsWith("snapshot/")) {
			// Snapshot processing is a placeholder; current State refresh runs separately.
			await bus.publish(
				Resource.Bus,
				State.Events.SnapshotCreated,
				input
			);
			await bus.publish(Resource.Bus, State.Events.StateUpdated, input);
		} else if (stateKey.startsWith("eventlog/")) {
			await bus.publish(
				Resource.Bus,
				State.Events.EventLogCreated,
				input
			);
		}
	});
}
