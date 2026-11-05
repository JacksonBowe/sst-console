import { z } from "zod";
import { defineEvent } from "../event";
import { StageKeySchema } from "./schema";

const stage = StageKeySchema.extend({
	accountId: z.string().regex(/^\d{12}$/)
});

export const Events = {
	StageProjectionRemovalRequested: defineEvent(
		"app.stage.projection_removal_requested",
		stage
	),
	StageRemoved: defineEvent("app.stage.removed", stage)
};
