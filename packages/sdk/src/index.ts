export type {
	Session,
	UserAuthJson,
	UserInviteConfirmJson,
	UserRecoverConfirmJson,
	UserRecoverJson,
	UserRefreshJson
} from "@console/functions/src/api/schemas/auth.schemas";

export type { AuthChallenge, AuthMethods, AuthResult } from "./auth";
export type {
	Account,
	AccountSyncPolicy,
	AccountApp,
	AccountDetail,
	AccountStage,
	AccountStatus,
	App,
	AppStage,
	BackupConnectionsResult,
	CognitoStatus,
	ConsoleMethods,
	DiscoveredStage,
	InviteUserInput,
	InviteUserResult,
	RecoverAccountsResult,
	Resource,
	ResourceTree,
	Stage,
	StageSelector,
	StateSnapshot,
	StageAccountConflict,
	SyncAccountResult,
	User,
	UsersFilters,
	UsersPage
} from "./console";
export {
	createClient,
	type AccessTokenProvider,
	type ApiClient,
	type AuthFailureHandler,
	type ClientOptions,
	type RefreshHandler
} from "./api-client";
export { ApiError, AuthError, toApiError } from "./errors";
export type { ApiErrorOptions, ErrorPayload } from "./errors";
