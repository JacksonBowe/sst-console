import { zValidator } from "@console/core/error";
import * as User from "@console/core/user";
import { Hono } from "hono";
import { assertActor } from "@console/core/actor";
import { userErrors } from "@console/core/user";
import { z } from "zod";

import {
	UserIdParamSchema,
	UserInviteJsonSchema,
	UserListQuerySchema
} from "./schemas/user.schemas";

export const userRoutes = new Hono()
	.post("/", zValidator("json", UserInviteJsonSchema), async c =>
		c.json(await User.invite(c.req.valid("json")))
	)
	.get("/", zValidator("query", UserListQuerySchema), async c =>
		c.json(await User.list(c.req.valid("query")))
	)
	.get("/:id", zValidator("param", UserIdParamSchema), async c =>
		c.json(await User.get(c.req.valid("param")))
	)
	.patch(
		"/:id/enabled",
		zValidator("param", UserIdParamSchema),
		zValidator("json", z.object({ enabled: z.boolean() })),
		async c => {
			const { id } = c.req.valid("param");
			const { enabled } = c.req.valid("json");
			if (!enabled && assertActor("user").properties.userId === id)
				throw userErrors.invalidState(
					"You cannot disable your own user"
				);
			await User.setEnabled({ id, enabled });
			return c.body(null, 204);
		}
	)
	.delete("/:id", zValidator("param", UserIdParamSchema), async c => {
		const input = c.req.valid("param");
		if (assertActor("user").properties.userId === input.id)
			throw userErrors.invalidState("You cannot delete your own user");
		await User.remove(input);
		return c.body(null, 204);
	});
