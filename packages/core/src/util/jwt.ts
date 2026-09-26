import { CognitoJwtVerifier } from "aws-jwt-verify";

import { AuthError } from "../error";

export async function verifyAccessToken(input: {
	token: string;
	poolId: string;
	clientId: string;
}) {
	try {
		return await CognitoJwtVerifier.create({
			userPoolId: input.poolId,
			clientId: input.clientId,
			tokenUse: "access"
		}).verify(input.token);
	} catch {
		throw new AuthError("invalid_token", "Invalid access token");
	}
}
