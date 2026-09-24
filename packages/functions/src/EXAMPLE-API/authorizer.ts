import { withActor } from "@sigil/core/actor";
import {
	AuthError,
	isULID,
	PublicError,
	UnhandledServerError
} from "@sigil/core/error";
import { Member } from "@sigil/core/organisation";
import { Auth } from "@sigil/core/user";
import { verifyAccessToken } from "@sigil/core/util/jwt";
import type { Context, MiddlewareHandler } from "hono";
import { Resource } from "sst";

async function validateToken(c: Context): Promise<{ userId: string }> {
	const authHeader = c.req.header("Authorization");
	if (!authHeader?.startsWith("Bearer ")) {
		throw new AuthError(
			"missing_authorization",
			"Missing or invalid Authorization header"
		);
	}

	const token = authHeader.split(" ")[1];
	if (!token) {
		throw new AuthError("missing_token", "Missing token");
	}

	const claims = await verifyAccessToken({
		token,
		poolId: Resource.AppCognitoUserPool.id,
		region: "ap-southeast-2"
	});

	if (!claims.sub) {
		throw new AuthError("invalid_token", "Invalid token claims");
	}

	const user = await Auth.exchangeCognitoId(claims.sub);
	if (!user) {
		throw new AuthError("user.not_found", "User not found");
	}

	return { userId: user.userId };
}

export const authorize: MiddlewareHandler = async (c, next) => {
	try {
		const { userId } = await validateToken(c);

		return withActor(
			{
				type: "user",
				properties: { userId }
			},
			() => next()
		);
	} catch (error) {
		if (error instanceof PublicError) {
			throw error;
		}

		throw new UnhandledServerError("Failed to authorize request", error);
	}
};

export const authorizeWithOrg: MiddlewareHandler = async (c, next) => {
	try {
		const { userId } = await validateToken(c);
		const organisationId = c.req.header("X-Organisation-Id");

		if (!organisationId) {
			throw new AuthError(
				"missing_organisation",
				"X-Organisation-Id header is required"
			);
		}

		if (!isULID().safeParse(organisationId).success) {
			throw new AuthError(
				"invalid_organisation",
				"Invalid X-Organisation-Id format"
			);
		}

		const membership = await Member.get({ organisationId, userId });

		return withActor(
			{
				type: "user",
				properties: {
					userId,
					organisation: {
						organisationId,
						role: membership.role
					}
				}
			},
			() => next()
		);
	} catch (error) {
		if (error instanceof PublicError) {
			throw error;
		}

		throw new UnhandledServerError("Failed to authorize request", error);
	}
};
