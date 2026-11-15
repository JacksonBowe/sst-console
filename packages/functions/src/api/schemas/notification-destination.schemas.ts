import { z } from "zod";

export {
	NotificationDestinationInputSchema,
	NotificationDestinationUpdateSchema
} from "@console/core/notification-destination";

export const NotificationDestinationIdParamSchema = z.object({
	id: z.string().min(1)
});
