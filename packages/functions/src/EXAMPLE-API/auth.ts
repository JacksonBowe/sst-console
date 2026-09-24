import { zValidator } from "@sigil/core/error";
import { Auth } from "@sigil/core/user";
import { Hono } from "hono";

import {
	UserAuthJsonSchema,
	UserConfirmSignUpJsonSchema,
	UserRecoverConfirmJsonSchema,
	UserRecoverJsonSchema,
	UserRefreshJsonSchema,
	UserResendConfirmationJsonSchema,
	UserSignUpJsonSchema
} from "./schemas/auth.schemas";

type Bindings = {};

const authRoutes = new Hono<{ Bindings: Bindings }>();

/** Authenticates a user with their credentials. */
authRoutes.post("/auth", zValidator("json", UserAuthJsonSchema), async c => {
	const input = c.req.valid("json");
	const result = await Auth.auth(input);
	return c.json(result);
});

/** Registers a new user account. */
authRoutes.post(
	"/signup",
	zValidator("json", UserSignUpJsonSchema),
	async c => {
		const input = c.req.valid("json");
		await Auth.signUp(input);
		return c.body(null, 204);
	}
);

/** Confirms a newly registered user account. */
authRoutes.post(
	"/signup/confirm",
	zValidator("json", UserConfirmSignUpJsonSchema),
	async c => {
		const input = c.req.valid("json");
		await Auth.confirmSignUp(input);
		return c.body(null, 204);
	}
);

/** Resends a sign-up confirmation code. */
authRoutes.post(
	"/signup/resend",
	zValidator("json", UserResendConfirmationJsonSchema),
	async c => {
		const input = c.req.valid("json");
		await Auth.resendConfirmation(input);
		return c.body(null, 204);
	}
);

/** Refreshes an authenticated user session. */
authRoutes.post(
	"/refresh",
	zValidator("json", UserRefreshJsonSchema),
	async c => {
		const input = c.req.valid("json");
		const result = await Auth.refresh(input);
		return c.json(result);
	}
);

/** Starts account recovery for a user. */
authRoutes.post(
	"/recover",
	zValidator("json", UserRecoverJsonSchema),
	async c => {
		const input = c.req.valid("json");
		await Auth.recover(input);
		return c.body(null, 204);
	}
);

/** Confirms account recovery with a verification code. */
authRoutes.post(
	"/recover/confirm",
	zValidator("json", UserRecoverConfirmJsonSchema),
	async c => {
		const input = c.req.valid("json");
		await Auth.recoverConfirm(input);
		return c.body(null, 204);
	}
);

export { authRoutes };
