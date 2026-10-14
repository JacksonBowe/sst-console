import * as Alert from "@console/core/alert";
import { zValidator } from "@console/core/error";
import { Hono } from "hono";
import { z } from "zod";

export const alertRoutes = new Hono()
	.get("/", async c => c.json(await Alert.list()))
	.post("/", zValidator("json", Alert.AlertInputSchema), async c =>
		c.json(await Alert.create(c.req.valid("json")), 201)
	)
	.put(
		"/:id",
		zValidator("param", z.object({ id: z.string().min(1) })),
		zValidator("json", Alert.AlertInputSchema),
		async c =>
			c.json(
				await Alert.update({
					...c.req.valid("param"),
					...c.req.valid("json")
				})
			)
	)
	.delete(
		"/:id",
		zValidator("param", z.object({ id: z.string().min(1) })),
		async c => {
			await Alert.remove(c.req.valid("param"));
			return c.body(null, 204);
		}
	);
