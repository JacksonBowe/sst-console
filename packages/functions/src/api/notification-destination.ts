import * as NotificationDestination from "@console/core/notification-destination";
import { zValidator } from "@console/core/error";
import { Hono } from "hono";

import {
	NotificationDestinationIdParamSchema,
	NotificationDestinationInputSchema,
	NotificationDestinationUpdateSchema
} from "./schemas/notification-destination.schemas";

export const notificationDestinationRoutes = new Hono()
	.get("/", async c => c.json(await NotificationDestination.list()))
	.post(
		"/",
		zValidator("json", NotificationDestinationInputSchema),
		async c =>
			c.json(
				await NotificationDestination.create(c.req.valid("json")),
				201
			)
	)
	.patch(
		"/:id",
		zValidator("param", NotificationDestinationIdParamSchema),
		zValidator("json", NotificationDestinationUpdateSchema),
		async c =>
			c.json(
				await NotificationDestination.update({
					...c.req.valid("param"),
					...c.req.valid("json")
				})
			)
	)
	.post(
		"/:id/test",
		zValidator("param", NotificationDestinationIdParamSchema),
		async c => {
			await NotificationDestination.test(c.req.valid("param"));
			return c.body(null, 204);
		}
	)
	.delete(
		"/:id",
		zValidator("param", NotificationDestinationIdParamSchema),
		async c => {
			await NotificationDestination.remove(c.req.valid("param"));
			return c.body(null, 204);
		}
	);
