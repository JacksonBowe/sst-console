import { z } from "zod";

/** Identifies the State belonging to one Stage. */
export const StateKeySchema = z.object({
	appName: z.string().min(1),
	stageName: z.string().min(1)
});
