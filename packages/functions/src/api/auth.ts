import { zValidator } from "@console/core/error";
import * as User from "@console/core/user";
import { Hono } from "hono";

import {
	UserAuthJsonSchema,
	// UserRecoverConfirmJsonSchema,
	// UserRecoverJsonSchema,
	// UserRefreshJsonSchema,
	// UserResendConfirmationJsonSchema,
} from "./schemas/auth.schemas";

type Bindings = {};

const authRoutes = new Hono<{ Bindings: Bindings }>();

/** Authenticates a user with their credentials. */
authRoutes.post("/auth", zValidator("json", UserAuthJsonSchema), async c => {
	const input = c.req.valid("json");
	const result = await User.Auth.auth(input);
	return c.json(result);
});

/** Refreshes an authenticated user session. */
// authRoutes.post(
// 	"/refresh",
// 	zValidator("json", UserRefreshJsonSchema),
// 	async c => {
// 		const input = c.req.valid("json");
// 		const result = await User.Auth.refresh(input);
// 		return c.json(result);
// 	}
// );

/** Starts account recovery for a user. */
// authRoutes.post(
// 	"/recover",
// 	zValidator("json", UserRecoverJsonSchema),
// 	async c => {
// 		const input = c.req.valid("json");
// 		await User.Auth.recover(input);
// 		return c.body(null, 204);
// 	}
// );

/** Confirms account recovery with a verification code. */
// authRoutes.post(
// 	"/recover/confirm",
// 	zValidator("json", UserRecoverConfirmJsonSchema),
// 	async c => {
// 		const input = c.req.valid("json");
// 		await User.Auth.recoverConfirm(input);
// 		return c.body(null, 204);
// 	}
// );

export { authRoutes };
