import { zValidator } from "@console/core/error";
import * as User from "@console/core/user";
import { Hono } from "hono";

import {
	UserAuthJsonSchema,
	UserInviteConfirmJsonSchema,
	UserRecoverConfirmJsonSchema,
	UserRecoverJsonSchema,
	UserRefreshJsonSchema
} from "./schemas/auth.schemas";

type Bindings = {};

const authRoutes = new Hono<{ Bindings: Bindings }>();

/** Authenticates a user with their credentials. */
authRoutes.post("/auth", zValidator("json", UserAuthJsonSchema), async c => {
	const input = c.req.valid("json");
	const result = await User.Auth.auth(input);
	return c.json(result);
});

authRoutes.post(
	"/invite/confirm",
	zValidator("json", UserInviteConfirmJsonSchema),
	async c => {
		const result = await User.Auth.inviteConfirm(c.req.valid("json"));
		return c.json(result);
	}
);

authRoutes.post(
	"/refresh",
	zValidator("json", UserRefreshJsonSchema),
	async c => {
		const result = await User.Auth.refresh(c.req.valid("json"));
		return c.json(result);
	}
);

authRoutes.post(
	"/recover",
	zValidator("json", UserRecoverJsonSchema),
	async c => {
		await User.Auth.recover(c.req.valid("json"));
		return c.body(null, 204);
	}
);

authRoutes.post(
	"/recover/confirm",
	zValidator("json", UserRecoverConfirmJsonSchema),
	async c => {
		await User.Auth.recoverConfirm(c.req.valid("json"));
		return c.body(null, 204);
	}
);

export { authRoutes };
