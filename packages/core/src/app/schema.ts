import { z } from "zod";

export const AppSchema = z.object({
	appName: z.string().min(1),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime()
});

export const AppKeySchema = AppSchema.pick({ appName: true });

export const StageSchema = z.object({
	appName: z.string().min(1),
	stageName: z.string().min(1),
	accountId: z.string().min(1),
	region: z.string().min(1),
	issueMonitoringEnabled: z.boolean(),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime()
});

export const StageKeySchema = StageSchema.pick({
	appName: true,
	stageName: true
});
