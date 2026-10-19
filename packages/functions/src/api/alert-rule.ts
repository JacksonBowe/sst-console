import * as AlertRule from "@console/core/alert-rule";
import { zValidator } from "@console/core/error";
import { Hono } from "hono";
import { z } from "zod";

export const alertRuleRoutes = new Hono()
	.get("/", async c => c.json(await AlertRule.list()))
	.post("/", zValidator("json", AlertRule.AlertRuleInputSchema), async c =>
		c.json(await AlertRule.create(c.req.valid("json")), 201)
	)
	.put(
		"/:id",
		zValidator("param", z.object({ id: z.string().min(1) })),
		zValidator("json", AlertRule.AlertRuleInputSchema),
		async c =>
			c.json(
				await AlertRule.update({
					...c.req.valid("param"),
					...c.req.valid("json")
				})
			)
	)
	.delete(
		"/:id",
		zValidator("param", z.object({ id: z.string().min(1) })),
		async c => {
			await AlertRule.remove(c.req.valid("param"));
			return c.body(null, 204);
		}
	);
