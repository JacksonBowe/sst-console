import { AccountIdSchema } from "../util/aws";
import { defineEvent } from "../event";
import { StageKeySchema } from "./schema";

const stage = StageKeySchema.extend({
	accountId: AccountIdSchema
});

export const Events = {
	StageProjectionRemovalRequested: defineEvent(
		"app.stage.projection_removal_requested",
		stage
	),
	StageRemoved: defineEvent("app.stage.removed", stage)
};
