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

async function validateToken(c: Context): Promise<{ userId: string }> {
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
	const userId = await User.exchangeCognitoSub({ cognitoSub: claims.sub });
	if (!userId) throw new AuthError("user.not_found", "User not found");
	return { userId };
}

/** Validates Cognito access token and binds its native Console actor. */
export const authorize: MiddlewareHandler = async (c, next) => {
	try {
		const { userId } = await validateToken(c);
		return withActor({ type: "user", properties: { userId } }, () =>
			next()
		);
	} catch (error) {
		if (error instanceof PublicError) throw error;
		throw new UnhandledServerError("Failed to authorize request", error);
	}
};
