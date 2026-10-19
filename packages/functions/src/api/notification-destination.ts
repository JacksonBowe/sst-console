import * as NotificationDestination from "@console/core/notification-destination";
import { zValidator } from "@console/core/error";
import { Hono } from "hono";
import { z } from "zod";

const IdSchema = z.object({ id: z.string().min(1) });

export const notificationDestinationRoutes = new Hono()
	.get("/", async c => c.json(await NotificationDestination.list()))
	.post(
		"/",
		zValidator(
			"json",
			NotificationDestination.NotificationDestinationInputSchema
		),
		async c =>
			c.json(
				await NotificationDestination.create(c.req.valid("json")),
				201
			)
	)
	.put(
		"/:id",
		zValidator("param", IdSchema),
		zValidator(
			"json",
			NotificationDestination.NotificationDestinationInputSchema
		),
		async c =>
			c.json(
				await NotificationDestination.update({
					...c.req.valid("param"),
					...c.req.valid("json")
				})
			)
	)
	.post("/:id/test", zValidator("param", IdSchema), async c => {
		await NotificationDestination.test(c.req.valid("param"));
		return c.body(null, 204);
	})
	.delete("/:id", zValidator("param", IdSchema), async c => {
		await NotificationDestination.remove(c.req.valid("param"));
		return c.body(null, 204);
	});
