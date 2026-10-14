import * as AlertTarget from "@console/core/alert-target";
import { zValidator } from "@console/core/error";
import { Hono } from "hono";
import { z } from "zod";

const IdSchema = z.object({ id: z.string().min(1) });

export const alertTargetRoutes = new Hono()
	.get("/", async c => c.json(await AlertTarget.list()))
	.post(
		"/",
		zValidator("json", AlertTarget.AlertTargetInputSchema),
		async c => c.json(await AlertTarget.create(c.req.valid("json")), 201)
	)
	.put(
		"/:id",
		zValidator("param", IdSchema),
		zValidator("json", AlertTarget.AlertTargetInputSchema),
		async c =>
			c.json(
				await AlertTarget.update({
					...c.req.valid("param"),
					...c.req.valid("json")
				})
			)
	)
	.post("/:id/test", zValidator("param", IdSchema), async c => {
		await AlertTarget.test(c.req.valid("param"));
		return c.body(null, 204);
	})
	.delete("/:id", zValidator("param", IdSchema), async c => {
		await AlertTarget.remove(c.req.valid("param"));
		return c.body(null, 204);
	});
