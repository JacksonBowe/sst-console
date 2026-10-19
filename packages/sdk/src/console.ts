import type { RequestFn } from "./request";

export type AccountStatus = "connected" | "disconnected";
export type IssueStatus = "open" | "resolved" | "suppressed";
export type NotificationChannel = "discord";
export type AlertRuleType = "issue";

export type AlertRule = {
	id: string;
	type: AlertRuleType;
	appName?: string;
	stageName?: string;
	notificationDestinationIds: string[];
	createdAt: string;
	updatedAt: string;
};

export type AlertRuleInput = {
	type: AlertRuleType;
	appName?: string;
	stageName?: string;
	notificationDestinationIds: string[];
};

export type NotificationDestination = {
	id: string;
	name: string;
	channel: NotificationChannel;
	configured: true;
	createdAt: string;
	updatedAt: string;
};

export type NotificationDestinationInput = {
	name: string;
	channel: NotificationChannel;
	channelConfig: { webhookUrl: string };
};

export type StageSelector = { app: string; stage?: string };

export type AccountSyncPolicy = {
	allowList: StageSelector[];
	ignoreList: StageSelector[];
};

export type StageAccountConflict = {
	appName: string;
	stageName: string;
	ownerAccountId: string;
};

export type Account = {
	accountId: string;
	region: string;
	roleArn: string;
	status: AccountStatus;
};

export type StateSnapshot = {
	accountId: string;
	appName: string;
	stageName: string;
	snapshotId: string;
	reverseTimestamp: string;
	sourceBucket: string;
	sourceKey: string;
	sourceVersion?: string;
	archiveKey?: string;
	createdAt: string;
};

export type Resource = {
	accountId: string;
	appName: string;
	stageName: string;
	resourceId: string;
	parentResourceId?: string;
	resourceKind: "component" | "physical";
	resourceType: string;
	urn: string;
	normalizedArn?: string;
	name?: string;
	summary?: unknown;
	createdAt: string;
	updatedAt: string;
};

export type ResourceTree = Resource & { children: ResourceTree[] };

export type AppStage = {
	stageName: string;
	accountId: string;
	region: string;
	issueMonitoringEnabled: boolean;
	createdAt: string;
	updatedAt: string;
	latestSnapshot: StateSnapshot | null;
	resourceCount: number;
};

export type App = {
	appName: string;
	createdAt: string;
	updatedAt: string;
};

export type AppSummary = App & {
	stages: AppStage[];
};

export type ListAppsOptions<Summaries extends boolean = boolean> = {
	summaries?: Summaries;
};

export type Stage = {
	appName: string;
	stageName: string;
	accountId: string;
	region: string;
	issueMonitoringEnabled: boolean;
	createdAt: string;
	updatedAt: string;
	latestSnapshot: StateSnapshot | null;
	resources: ResourceTree[];
};

export type AccountStage = {
	stageName: string;
	createdAt: string;
	updatedAt: string;
	latestSnapshot: StateSnapshot | null;
	resources: ResourceTree[];
};

export type AccountApp = {
	appName: string;
	createdAt: string;
	updatedAt: string;
	stages: AccountStage[];
};

export type AccountDetail = {
	account: Account & {
		stateBucket?: string;
		lastSyncedAt?: string;
		lastSyncConflicts?: StageAccountConflict[];
		createdAt?: string;
		updatedAt: string;
	};
	apps: AccountApp[];
};

export type SyncAccountResult = {
	accountId: string;
	arn: string;
	region: string;
	roleArn: string;
	stateBucket: string;
	states: Array<{
		app: string;
		stage: string;
		key: string;
		lastModified?: string;
		size?: number;
	}>;
	statesTruncated: boolean;
	skippedStages: StageAccountConflict[];
};

export type DiscoveredStage = {
	app: string;
	stage: string;
	key: string;
	lastModified?: string;
	size?: number;
	discoveredAt: string;
};

export type ManageAccountApps = {
	policy: AccountSyncPolicy;
	stages: DiscoveredStage[];
};

export type RecoverAccountsResult = {
	recovered: number;
	results: Array<{
		accountId: string;
		status: "recovered" | "failed";
		error?: string;
	}>;
};

export type BackupConnectionsResult = { backedUp: number };

export type CognitoStatus = "FORCE_CHANGE_PASSWORD" | "CONFIRMED";

export type User = {
	id: string;
	email: string;
	cognitoStatus: CognitoStatus;
	cognitoEnabled: boolean;
	createdAt: string;
	updatedAt: string;
};

export type UsersFilters = {
	limit?: number;
	cursor?: string;
	email?: string;
	cognitoStatus?: CognitoStatus;
	cognitoEnabled?: boolean;
};

export type UsersPage = {
	items: User[];
	meta: {
		limit: number;
		hasMore: boolean;
		nextCursor: string | null;
	};
};

export type InviteUserInput = { email: string };
export type InviteUserResult = { id: string };

export type Issue = {
	appName: string;
	stageName: string;
	fingerprint: string;
	accountId: string;
	region: string;
	functionArn?: string;
	functionName?: string;
	errorType: string;
	errorMessage: string;
	stack?: string;
	status: IssueStatus;
	statusUpdatedAt: string;
	count: number;
	firstSeenAt: string;
	lastSeenAt: string;
	logGroup: string;
	logStream: string;
	logTimestamp: number;
};

export type IssuesFilters = {
	appName?: string;
	stageName?: string;
	status?: IssueStatus;
};

export const consoleMethods = (request: RequestFn) => ({
	listNotificationDestinations: (): Promise<NotificationDestination[]> =>
		request({ method: "GET", url: "notification-destinations" }),
	createNotificationDestination: (
		input: NotificationDestinationInput
	): Promise<NotificationDestination> =>
		request({
			method: "POST",
			url: "notification-destinations",
			data: input
		}),
	updateNotificationDestination: (
		id: string,
		input: NotificationDestinationInput
	): Promise<NotificationDestination> =>
		request({
			method: "PUT",
			url: `notification-destinations/${encodeURIComponent(id)}`,
			data: input
		}),
	removeNotificationDestination: (id: string): Promise<void> =>
		request({
			method: "DELETE",
			url: `notification-destinations/${encodeURIComponent(id)}`
		}),
	testNotificationDestination: (id: string): Promise<void> =>
		request({
			method: "POST",
			url: `notification-destinations/${encodeURIComponent(id)}/test`
		}),
	listAlertRules: (): Promise<AlertRule[]> =>
		request({ method: "GET", url: "alert-rules" }),
	createAlertRule: (input: AlertRuleInput): Promise<AlertRule> =>
		request({ method: "POST", url: "alert-rules", data: input }),
	updateAlertRule: (id: string, input: AlertRuleInput): Promise<AlertRule> =>
		request({
			method: "PUT",
			url: `alert-rules/${encodeURIComponent(id)}`,
			data: input
		}),
	removeAlertRule: (id: string): Promise<void> =>
		request({
			method: "DELETE",
			url: `alert-rules/${encodeURIComponent(id)}`
		}),
	listApps: <Summaries extends boolean = false>(
		options: ListAppsOptions<Summaries> = {}
	): Promise<Summaries extends true ? AppSummary[] : App[]> =>
		request<Summaries extends true ? AppSummary[] : App[]>({
			method: "GET",
			url: "apps",
			params: options
		}),
	getApp: (appName: string): Promise<AppSummary> =>
		request({ method: "GET", url: `apps/${encodeURIComponent(appName)}` }),
	getStage: (appName: string, stageName: string): Promise<Stage> =>
		request({
			method: "GET",
			url: `apps/${encodeURIComponent(appName)}/stages/${encodeURIComponent(stageName)}`
		}),
	listAccounts: (): Promise<Account[]> =>
		request({ method: "GET", url: "accounts" }),
	getAccount: (accountId: string): Promise<AccountDetail> =>
		request({
			method: "GET",
			url: `accounts/${encodeURIComponent(accountId)}`
		}),
	syncAccount: (accountId: string): Promise<SyncAccountResult> =>
		request({
			method: "POST",
			url: `accounts/${encodeURIComponent(accountId)}/sync`
		}),
	getManageAccountApps: (accountId: string): Promise<ManageAccountApps> =>
		request({
			method: "GET",
			url: `accounts/${encodeURIComponent(accountId)}/manage-apps`
		}),
	refreshAccountDiscovery: (accountId: string) =>
		request<{
			accountId: string;
			stateBucket: string;
			states: Omit<DiscoveredStage, "discoveredAt">[];
		}>({
			method: "POST",
			url: `accounts/${encodeURIComponent(accountId)}/discovery`
		}),
	updateAccountSyncPolicy: (
		accountId: string,
		policy: AccountSyncPolicy
	): Promise<AccountSyncPolicy> =>
		request({
			method: "PUT",
			url: `accounts/${encodeURIComponent(accountId)}/sync-policy`,
			data: { policy }
		}),
	applyAccountSyncPolicy: (
		accountId: string,
		policy: AccountSyncPolicy
	): Promise<SyncAccountResult> =>
		request({
			method: "POST",
			url: `accounts/${encodeURIComponent(accountId)}/sync-policy/apply`,
			data: { policy }
		}),
	recoverAccounts: (): Promise<RecoverAccountsResult> =>
		request({ method: "POST", url: "accounts/recover" }),
	backupConnections: (): Promise<BackupConnectionsResult> =>
		request({ method: "POST", url: "accounts/backup-connections" }),
	listIssues: (filters: IssuesFilters = {}): Promise<Issue[]> =>
		request({ method: "GET", url: "issues", params: filters }),
	setIssueStatus: (
		issue: Pick<Issue, "appName" | "stageName" | "fingerprint">,
		status: IssueStatus
	): Promise<void> =>
		request({
			method: "POST",
			url: `issues/${encodeURIComponent(issue.appName)}/${encodeURIComponent(issue.stageName)}/${encodeURIComponent(issue.fingerprint)}/status`,
			data: { status }
		}),
	disableAllIssueMonitoring: (): Promise<{ disabled: number }> =>
		request({ method: "POST", url: "issues/monitoring/disable" }),
	setStageIssueMonitoring: (
		appName: string,
		stageName: string,
		enabled: boolean
	): Promise<void> =>
		request({
			method: "POST",
			url: `issues/${encodeURIComponent(appName)}/${encodeURIComponent(stageName)}/${enabled ? "connect" : "disconnect"}`
		}),
	purgeIssues: (): Promise<void> =>
		request({ method: "DELETE", url: "issues" }),
	testIssueQuery: (): Promise<{ message: string }> =>
		request({ method: "POST", url: "issues/test-query" }),
	listUsers: (filters: UsersFilters = {}): Promise<UsersPage> =>
		request({ method: "GET", url: "users", params: filters }),
	inviteUser: (input: InviteUserInput): Promise<InviteUserResult> =>
		request({ method: "POST", url: "users", data: input }),
	removeUser: (id: string): Promise<void> =>
		request({ method: "DELETE", url: `users/${encodeURIComponent(id)}` })
});

export type ConsoleMethods = ReturnType<typeof consoleMethods>;
