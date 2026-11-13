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
	stateBucket?: string;
	lastSyncConflicts?: StageAccountConflict[];
	createdAt: string;
	updatedAt: string;
};

export type State = {
	accountId: string;
	appName: string;
	stageName: string;
	sourceBucket: string;
	sourceKey: string;
	sourceVersion?: string;
	observedAt: string;
};

export type HistoryKey = {
	accountId: string;
	appName: string;
	stageName: string;
};
export type StateArtifact = { updateId: string; processedAt?: string };
export type StateUpdate = StateArtifact & {
	command?: string;
	sstVersion?: string;
	timeStarted?: string;
	timeCompleted?: string;
	errors?: Array<{ urn: string; message: string }>;
	errorsTruncated?: boolean;
	comparisonStatus?: "available" | "unavailable";
	resourceCounts?: {
		created: number;
		updated: number;
		deleted: number;
		unchanged: number;
	};
};
export type StateResourceEvent = {
	resourceId: string;
	urn: string;
	resourceType: string;
	action: "created" | "updated" | "deleted";
	snapshot?: object;
	operation?: {
		startedAt: string;
		completedAt?: string;
		outcome: "unknown" | "succeeded" | "failed";
	};
};
export type StateUpdateDetail = {
	update: StateUpdate;
	snapshot: StateArtifact | null;
	eventLog: StateArtifact | null;
	events: StateResourceEvent[];
};
export type HistoryDiscoveryResult = {
	processed: number;
	skipped: number;
	failed: number;
	failures: Array<{ key: string; reason: string }>;
	failuresTruncated: boolean;
};

function historyUrl(key: HistoryKey) {
	return `accounts/${encodeURIComponent(key.accountId)}/state/${encodeURIComponent(key.appName)}/${encodeURIComponent(key.stageName)}`;
}

export type Resource = {
	accountId: string;
	appName: string;
	stageName: string;
	resourceId: string;
	parentResourceId?: string;
	resourceKind: "component" | "resource";
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
	state: State | null;
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
	state: State | null;
	resources: ResourceTree[];
};

export type SyncAccountResult = {
	accountId: string;
	stateBucket: string;
	states: Array<{
		app: string;
		stage: string;
		key: string;
		lastModified?: string;
		size?: number;
	}>;
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

export type Page<T> = {
	items: T[];
	meta: {
		limit: number;
		hasMore: boolean;
		nextCursor: string | null;
	};
};

export type UsersPage = Page<User>;

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
	listStageUpdates: (
		appName: string,
		stageName: string,
		options?: { limit?: number; cursor?: string }
	): Promise<Page<StateUpdate>> =>
		request({
			method: "GET",
			url: `apps/${encodeURIComponent(appName)}/stages/${encodeURIComponent(stageName)}/updates`,
			params: options
		}),
	getStageUpdate: (
		appName: string,
		stageName: string,
		updateId: string
	): Promise<StateUpdateDetail> =>
		request({
			method: "GET",
			url: `apps/${encodeURIComponent(appName)}/stages/${encodeURIComponent(stageName)}/updates/${encodeURIComponent(updateId)}`
		}),
	listStateUpdates: (key: HistoryKey): Promise<StateUpdate[]> =>
		request({ method: "GET", url: `${historyUrl(key)}/updates` }),
	listStateSnapshots: (key: HistoryKey): Promise<StateArtifact[]> =>
		request({ method: "GET", url: `${historyUrl(key)}/snapshots` }),
	listStateEventLogs: (key: HistoryKey): Promise<StateArtifact[]> =>
		request({ method: "GET", url: `${historyUrl(key)}/event-logs` }),
	listStateResourceEvents: (
		key: HistoryKey,
		updateId: string
	): Promise<StateResourceEvent[]> =>
		request({
			method: "GET",
			url: `${historyUrl(key)}/updates/${encodeURIComponent(updateId)}/events`
		}),
	discoverStateHistory: (key: HistoryKey): Promise<HistoryDiscoveryResult> =>
		request({ method: "POST", url: `${historyUrl(key)}/backfill` }),
	processStateHistory: (
		key: HistoryKey,
		updateId: string
	): Promise<{ published: number }> =>
		request({
			method: "POST",
			url: `${historyUrl(key)}/updates/${encodeURIComponent(updateId)}/process`
		}),
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
	getAccount: (accountId: string): Promise<Account> =>
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
	testIssue: (): Promise<void> =>
		request({ method: "POST", url: "issues/test" }),
	listUsers: (filters: UsersFilters = {}): Promise<UsersPage> =>
		request({ method: "GET", url: "users", params: filters }),
	inviteUser: (input: InviteUserInput): Promise<InviteUserResult> =>
		request({ method: "POST", url: "users", data: input }),
	removeUser: (id: string): Promise<void> =>
		request({ method: "DELETE", url: `users/${encodeURIComponent(id)}` })
});

export type ConsoleMethods = ReturnType<typeof consoleMethods>;
