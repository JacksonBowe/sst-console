import { z } from "zod";

export const AppNameParamSchema = z.object({ appName: z.string().min(1) });

export const StageParamSchema = AppNameParamSchema.extend({
	stageName: z.string().min(1)
});

export const AppListQuerySchema = z.object({
	summaries: z.stringbool().default(false)
});
