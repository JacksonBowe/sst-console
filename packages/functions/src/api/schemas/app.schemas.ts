import { z } from "zod";

export const AppNameParamSchema = z.object({ appName: z.string().min(1) });

export const StageParamSchema = AppNameParamSchema.extend({
	stageName: z.string().min(1)
});

export const StageUpdateParamSchema = StageParamSchema.extend({
	updateId: z.string().min(1)
});

export const AppListQuerySchema = z.object({
	summaries: z.stringbool().default(false)
});

export const StageUpdateListQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(50).default(50),
	cursor: z.string().min(1).optional()
});
