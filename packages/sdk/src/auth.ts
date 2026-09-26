import type {
	Session,
	UserAuthJson,
	UserInviteConfirmJson,
	UserRecoverConfirmJson,
	UserRecoverJson,
	UserRefreshJson
} from "@console/functions/src/api/schemas/auth.schemas";

import type { RequestFn } from "./request";

export type AuthChallenge = {
	challengeName: "NEW_PASSWORD_REQUIRED";
	session?: string;
};

export type AuthResult = Session | AuthChallenge;

export const authMethods = (request: RequestFn) => ({
	login: (input: UserAuthJson): Promise<AuthResult> =>
		request({ method: "POST", url: "noauth/auth", data: input }),
	inviteConfirm: (input: UserInviteConfirmJson): Promise<Session> =>
		request({ method: "POST", url: "noauth/invite/confirm", data: input }),
	refresh: (input: UserRefreshJson): Promise<Session> =>
		request({
			method: "POST",
			url: "noauth/refresh",
			data: input,
			_noRetry: true
		}),
	recover: (input: UserRecoverJson): Promise<void> =>
		request({ method: "POST", url: "noauth/recover", data: input }),
	recoverConfirm: (input: UserRecoverConfirmJson): Promise<void> =>
		request({ method: "POST", url: "noauth/recover/confirm", data: input })
});

export type AuthMethods = ReturnType<typeof authMethods>;
