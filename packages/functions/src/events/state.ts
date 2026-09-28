import * as Account from "@console/core/account";
import { withActor } from "@console/core/actor";

type S3StateEvent = {
	account?: string;
	detail?: {
		bucket?: { name?: string };
		object?: { key?: string };
	};
};

export async function handler(event: S3StateEvent): Promise<void> {
	const accountId = event.account;
	const stateBucket = event.detail?.bucket?.name;
	const stateKey = event.detail?.object?.key;
	if (!accountId || !stateBucket || !stateKey) {
		console.warn("Ignoring incomplete S3 state event", event);
		return;
	}

	await withActor({ type: "system", properties: {} }, async () => {
		const result = await Account.syncStateObject({
			accountId,
			stateBucket,
			stateKey
		});
		console.log("State object reconciliation complete", result);
	});
}
