import type { CustomMessageTriggerHandler } from "aws-lambda";

import { create, exchangeCognitoSub } from "@console/core/user";

/** Provisions Console user before Cognito sends admin-created-user invite. */
export const handler: CustomMessageTriggerHandler = async event => {
	if (event.triggerSource !== "CustomMessage_AdminCreateUser") return event;

	const cognitoSub = event.request.userAttributes.sub;
	const email = event.request.userAttributes.email;
	if (!cognitoSub || !email) {
		throw new Error("Cognito invite is missing required user attributes");
	}

	const existingId = await exchangeCognitoSub({ cognitoSub });
	if (existingId) return event;

	try {
		await create({
			cognitoSub,
			email,
			cognitoStatus: "FORCE_CHANGE_PASSWORD",
			cognitoEnabled: true
		});
	} catch (error) {
		const winningId = await exchangeCognitoSub({ cognitoSub });
		if (!winningId) throw error;
	}
	return event;
};
