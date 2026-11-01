import * as Account from "@console/core/account";
import * as State from "@console/core/state";
import { withActor } from "@console/core/actor";

type S3StateEvent = {
	account?: string;
	"detail-type"?: string;
	detail?: {
		bucket?: { name?: string };
		object?: { key?: string; sequencer?: string };
	};
};

enum StateArtifactEvent {
	CurrentState = "current-state",
	StateUpdate = "state-update",
	Ignored = "ignored"
}

export async function handler(event: S3StateEvent): Promise<void> {
	const accountId = event.account;
	const stateBucket = event.detail?.bucket?.name;
	const stateKey = event.detail?.object?.key;
	if (!accountId || !stateBucket || !stateKey) {
		console.warn("Ignoring incomplete S3 state event");
		return;
	}

	const input = { accountId, stateBucket, stateKey };
	const artifactEvent = classifyArtifactEvent(event["detail-type"], stateKey);
	if (artifactEvent === StateArtifactEvent.Ignored) {
		return;
	}
	const sequencer =
		artifactEvent === StateArtifactEvent.StateUpdate
			? State.Update.normalizeSequencer(event.detail?.object?.sequencer)
			: undefined;
	if (artifactEvent === StateArtifactEvent.StateUpdate && !sequencer) {
		console.warn("Ignoring S3 update event without a valid sequencer");
		return;
	}

	await withActor({ type: "system", properties: {} }, async () => {
		switch (artifactEvent) {
			case StateArtifactEvent.CurrentState:
				console.log(
					"State object reconciliation complete",
					await Account.Sync.syncStateObject(input)
				);
				return;
			case StateArtifactEvent.StateUpdate:
				console.log(
					"State object reconciliation complete",
					await Account.Sync.syncStateUpdateObject({
						...input,
						sequencer: sequencer!
					})
				);
				return;
		}
	});
}

function classifyArtifactEvent(
	eventType: string | undefined,
	key: string
): StateArtifactEvent {
	// S3 object deletion events apply only to mutable app/ State artifacts.
	if (
		key.startsWith("app/") &&
		(eventType === "Object Created" || eventType === "Object Deleted")
	)
		return StateArtifactEvent.CurrentState;
	if (key.startsWith("update/") && eventType === "Object Created")
		return StateArtifactEvent.StateUpdate;

	/*
	#68 out of scope:
	if snapshot key and Object Created:
	  future snapshot ingestion
	if eventlog key and Object Created:
	  future event-log enrichment
	*/
	return StateArtifactEvent.Ignored;
}
