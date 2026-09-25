import { timingSafeEqual } from "node:crypto";

import { AuthError, ServerError } from "@console/core/error";
import type { MiddlewareHandler } from "hono";

export const authorizeDebug: MiddlewareHandler = async (c, next) => {
	const username = process.env.SST_CONSOLE_DEBUG_USERNAME;
	const password = process.env.SST_CONSOLE_DEBUG_PASSWORD;
	if (!username || !password) {
		throw new ServerError(
			"debug_auth_not_configured",
			"Debug API authentication is not configured"
		);
	}

	const authorization = c.req.header("Authorization");
	const expected = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
	if (!authorization || !safeEqual(authorization, expected)) {
		throw new AuthError(
			"invalid_authorization",
			"Valid Basic authorization is required"
		);
	}
	return next();
};

function safeEqual(left: string, right: string): boolean {
	const leftBytes = new Uint8Array(Buffer.from(left));
	const rightBytes = new Uint8Array(Buffer.from(right));
	return (
		leftBytes.length === rightBytes.length &&
		timingSafeEqual(leftBytes, rightBytes)
	);
}
