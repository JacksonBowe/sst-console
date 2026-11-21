import {
	AuthError,
	PublicError,
	UnhandledServerError
} from "@console/core/error";
import { withActor } from "@console/core/actor";
import * as User from "@console/core/user";
import { verifyAccessToken } from "@console/core/util/jwt";
import type { MiddlewareHandler } from "hono";
import type { Context } from "hono";
import { Resource } from "sst";

async function validateToken(c: Context): Promise<User.UserInfo> {
	const authorization = c.req.header("Authorization");
	if (!authorization?.startsWith("Bearer ")) {
		throw new AuthError(
			"missing_authorization",
			"Missing or invalid Authorization header"
		);
	}
	const token = authorization.slice("Bearer ".length);
	if (!token) throw new AuthError("missing_token", "Missing token");
	const claims = await verifyAccessToken({
		token,
		poolId: Resource.SSTConsoleCognitoUserPool.id,
		clientId: Resource.SSTConsoleCognitoUserPoolClient.id
	});
	if (!claims.sub)
		throw new AuthError("invalid_token", "Invalid access token claims");
	const identity = await User.getIdentity({ cognitoSub: claims.sub });
	if (!identity) throw new AuthError("user.not_found", "User not found");
	const user = await User.get({ id: identity.userId });
	if (!user.cognitoEnabled)
		throw new AuthError("user.disabled", "User is disabled");
	return user;
}

/** Validates Cognito access token and binds its native Console actor. */
export const authorize: MiddlewareHandler = async (c, next) => {
	try {
		const user = await validateToken(c);
		return withActor(
			{ type: "user", properties: { userId: user.id } },
			() => next()
		);
	} catch (error) {
		if (error instanceof PublicError) throw error;
		throw new UnhandledServerError("Failed to authorize request", error);
	}
};
