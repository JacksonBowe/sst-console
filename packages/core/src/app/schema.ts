import { z } from "zod";

export const StageSchema = z.object({
	appName: z.string().min(1),
	stageName: z.string().min(1)
});
