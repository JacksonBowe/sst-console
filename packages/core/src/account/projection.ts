import { AccountIdSchema } from "../util/aws";
import * as App from "../app/app";
import * as Stage from "../app/app.stage";
import * as Resource from "../app/resource";
import * as Discovery from "../state/discovery";
import { removeStageHistory } from "../state/state";
import { fn } from "../util/fn";

/** Removes account projections on disconnect without changing monitoring behavior. */
// TODO: Align disconnect cleanup with the event-driven Stage removal lifecycle.
export const removeAccountProjections = fn(AccountIdSchema, async accountId => {
	const [stages, discoveredStages] = await Promise.all([
		Stage.listByAccount({ accountId }),
		Discovery.list({ accountId })
	]);
	await Resource.remove(stages);
	// Keep Stages available for retry if history cleanup fails.
	await Promise.all(stages.map(stage => removeStageHistory(stage)));
	await Stage.remove(stages);
	await Discovery.remove(discoveredStages);
	for (const appName of new Set(stages.map(stage => stage.appName)))
		await App.removeIfEmpty({ appName });
});
