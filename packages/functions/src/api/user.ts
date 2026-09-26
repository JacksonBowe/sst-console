import { zValidator } from "@console/core/error";
import * as User from "@console/core/user";
import { Hono } from "hono";

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
	.get("/:id", zValidator("param", UserIdParamSchema), async c => {
		const user = await User.get(c.req.valid("param"));
		if (!user) throw User.userErrors.notFound();
		return c.json(user);
	})
	.delete("/:id", zValidator("param", UserIdParamSchema), async c => {
		await User.remove(c.req.valid("param"));
		return c.body(null, 204);
	});
