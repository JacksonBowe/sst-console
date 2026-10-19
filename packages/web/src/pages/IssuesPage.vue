<template>
	<DashboardPage>
		<DashboardPageHeader
			title="Issues"
			subtitle="Investigate workload failures and configure notifications"
		>
			<template #actions>
				<q-btn
					v-if="activeTab === 'rules'"
					unelevated
					no-caps
					color="primary"
					label="Create rule"
					@click="openRule"
				/>
				<q-btn
					v-else-if="activeTab === 'channels'"
					unelevated
					no-caps
					color="primary"
					label="Add destination"
					@click="openChannel"
				/>
				<q-btn
					v-else
					flat
					dense
					round
					icon="sym_r_more_horiz"
					aria-label="Issue maintenance actions"
				>
					<q-menu
						><q-list dense style="min-width: 13rem">
							<q-item
								clickable
								v-close-popup
								@click="confirmDisableAllMonitoring"
								><q-item-section
									>Disable monitoring</q-item-section
								></q-item
							>
							<q-item
								clickable
								v-close-popup
								class="text-negative"
								@click="confirmPurge"
								><q-item-section
									>Delete all issues</q-item-section
								></q-item
							>
						</q-list></q-menu
					>
				</q-btn>
			</template>
		</DashboardPageHeader>

		<q-tabs
			v-model="activeTab"
			dense
			no-caps
			align="left"
			active-color="primary"
			indicator-color="primary"
			class="issues-page__tabs"
		>
			<q-tab name="issues" label="Issues" />
			<q-tab name="rules" label="Alert rules" />
			<q-tab name="channels" label="Notification destinations" />
		</q-tabs>

		<DashboardPageContent v-if="activeTab === 'issues'">
			<div class="row q-gutter-md text-caption text-secondary">
				<span>{{ openIssueCount }} open issues in current scope</span
				><span>{{ occurrenceCount }} occurrences</span
				><span>{{ monitoredStageCount }} monitored stages</span>
			</div>
			<TableToolbar>
				<template #search
					><TableSearch v-model="tableFilters.text"
				/></template>
				<template #filters>
					<TableFilter
						v-model="tableFilters.facets.appName"
						label="App"
						:options="appOptions"
						searchable
					/>
					<TableFilter
						v-model="tableFilters.facets.stageName"
						label="Stage"
						:options="stageOptions"
						searchable
					/>
					<TableFilter
						v-model="tableFilters.facets.status"
						label="Status"
						:options="statusOptions"
					/>
					<TableClearFilters
						:filters="tableFilters"
						@clear-facets="clearFacets"
					/>
				</template>
			</TableToolbar>
			<IssuesListErrorState
				v-if="issuesQuery.isError.value"
				@retry="issuesQuery.refetch()"
			/>
			<div v-else class="issues-page__investigation">
				<IssuesTable
					:issues="issues"
					:loading="issuesQuery.isPending.value"
					:filters="tableFilters"
					:selected-fingerprint="selectedIssue?.fingerprint"
					@select="selectedIssue = $event"
					@status="setStatus"
				/>
				<IssueDetailPanel
					:issue="selectedIssue"
					@status="selectedIssue && setStatus(selectedIssue, $event)"
				/>
			</div>
		</DashboardPageContent>

		<DashboardPageContent v-else-if="activeTab === 'rules'">
			<div class="text-body2 text-secondary"
				>Rules determine which issues trigger notifications and which
				notification destinations receive them.</div
			>
			<AlertRulesTable
				:alerts="alertsQuery.data.value ?? []"
				:targets="targetsQuery.data.value ?? []"
				:loading="alertsQuery.isPending.value"
				@remove="removeRule"
			/>
		</DashboardPageContent>

		<DashboardPageContent v-else>
			<div class="text-body2 text-secondary"
				>Notification destinations are reusable destinations for issue
				notifications.</div
			>
			<NotificationDestinationsTable
				:targets="targetsQuery.data.value ?? []"
				:alerts="alertsQuery.data.value ?? []"
				:loading="targetsQuery.isPending.value"
				:testing-target-id="testingTargetId"
				@test="testTarget"
				@remove="removeTarget"
			/>
		</DashboardPageContent>
	</DashboardPage>
</template>

<script setup lang="ts">
import type {
	AlertRule,
	NotificationDestination,
	Issue,
	IssueStatus
} from "@sst-console/sdk";
import { useQueryClient } from "@tanstack/vue-query";
import { Dialog, Notify } from "quasar";
import { computed, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { api, handleApiError } from "@/boot/api-client";
import {
	NotificationDestinationForm,
	NotificationDestinationsTable,
	AlertRuleForm,
	AlertRulesTable
} from "@/components/AlertRules";
import {
	IssueDetailPanel,
	IssuesListErrorState,
	IssuesTable
} from "@/components/Issues";
import {
	DashboardPage,
	DashboardPageContent,
	DashboardPageHeader
} from "@/components/ui/Dashboard";
import { DialogBase, DialogConfirm } from "@/components/ui/Dialog";
import {
	TableClearFilters,
	TableFilter,
	TableSearch,
	TableToolbar,
	type Filters
} from "@/components/ui/Table";
import { useNotificationDestinations } from "@/composables/notification-destinations";
import { useAlertRules } from "@/composables/alert-rules";
import { useApps } from "@/composables/apps";
import { useIssues } from "@/composables/issues";

type Tab = "issues" | "rules" | "channels";
const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const activeTab = ref<Tab>(tabFromQuery(route.query.tab));
const issuesQuery = useIssues({});
const appsQuery = useApps();
const alertsQuery = useAlertRules();
const targetsQuery = useNotificationDestinations();
const testingTargetId = ref<string>();
const selectedIssue = ref<Issue>();
const tableFilters = reactive<Filters>({
	text: "",
	facets: {
		appName: queryValues(route.query.app),
		stageName: queryValues(route.query.stage),
		status: queryValues(route.query.status)
	}
});
const statusOptions: Array<{ label: string; value: IssueStatus }> = [
	{ label: "Open", value: "open" },
	{ label: "Resolved", value: "resolved" },
	{ label: "Suppressed", value: "suppressed" }
];
const issues = computed(() =>
	[...(issuesQuery.data.value ?? [])].sort((left, right) =>
		right.lastSeenAt.localeCompare(left.lastSeenAt)
	)
);
const appOptions = computed(() => filterOptions(issues.value, "appName"));
const stageOptions = computed(() => filterOptions(issues.value, "stageName"));
const openIssueCount = computed(
	() => issues.value.filter(issue => issue.status === "open").length
);
const occurrenceCount = computed(() =>
	issues.value
		.filter(issue => issue.status === "open")
		.reduce((total, issue) => total + issue.count, 0)
);
const monitoredStageCount = computed(
	() =>
		appsQuery.data.value
			?.flatMap(app => app.stages)
			.filter(stage => stage.issueMonitoringEnabled).length ?? 0
);

watch(
	activeTab,
	tab =>
		void router.replace({
			query: { ...route.query, tab: tab === "issues" ? undefined : tab }
		})
);

function tabFromQuery(value: unknown): Tab {
	return value === "rules" || value === "channels" ? value : "issues";
}
function queryValues(value: unknown): string[] {
	return typeof value === "string"
		? [value]
		: Array.isArray(value)
			? value.filter((item): item is string => typeof item === "string")
			: [];
}
function filterOptions(items: Issue[], field: "appName" | "stageName") {
	return [...new Set(items.map(item => item[field]))]
		.sort()
		.map(value => ({ label: value, value }));
}
function clearFacets() {
	tableFilters.facets.appName = [];
	tableFilters.facets.stageName = [];
	tableFilters.facets.status = [];
}
async function setStatus(issue: Issue, status: IssueStatus) {
	try {
		await api.setIssueStatus(issue, status);
		await queryClient.invalidateQueries({ queryKey: ["issues"] });
	} catch (error) {
		handleApiError(error);
	}
}
function openRule() {
	Dialog.create({
		component: DialogBase,
		componentProps: { contentComponent: AlertRuleForm }
	});
}
function openChannel() {
	Dialog.create({
		component: DialogBase,
		componentProps: { contentComponent: NotificationDestinationForm }
	});
}
function removeRule(alert: AlertRule) {
	confirmDelete(
		"Delete alert rule",
		`Delete rule for ${sourceLabel(alert)}?`,
		() => api.removeAlertRule(alert.id).then(() => alertsQuery.refetch())
	);
}
function removeTarget(target: NotificationDestination) {
	confirmDelete(
		"Delete notification destination",
		`Delete ${target.name}? Remove it from every alert rule first.`,
		() =>
			api
				.removeNotificationDestination(target.id)
				.then(() => targetsQuery.refetch())
	);
}
function confirmDelete(
	title: string,
	message: string,
	perform: () => Promise<unknown>
) {
	Dialog.create({
		component: DialogConfirm,
		componentProps: {
			title,
			message,
			variant: "negative",
			confirmLabel: "Delete",
			perform
		}
	});
}
function sourceLabel(alert: AlertRule) {
	return !alert.appName
		? "all apps and stages"
		: `${alert.appName} · ${alert.stageName ?? "all stages"}`;
}
async function testTarget(target: NotificationDestination) {
	testingTargetId.value = target.id;
	try {
		await api.testNotificationDestination(target.id);
		Notify.create({
			message: `Test notification sent to ${target.name}`,
			color: "positive"
		});
	} catch (error) {
		handleApiError(error);
	} finally {
		testingTargetId.value = undefined;
	}
}
function confirmPurge() {
	Dialog.create({
		component: DialogConfirm,
		componentProps: {
			title: "Delete all issues",
			message: "This permanently deletes every persisted issue.",
			validationString: "DELETE",
			variant: "negative",
			confirmLabel: "Delete all",
			perform: async () => {
				await api.purgeIssues();
				await queryClient.invalidateQueries({ queryKey: ["issues"] });
			}
		}
	});
}
function confirmDisableAllMonitoring() {
	Dialog.create({
		component: DialogConfirm,
		componentProps: {
			title: "Disable issue monitoring",
			message:
				"This disables issue monitoring on every monitored stage. Existing log subscriptions are removed asynchronously.",
			validationString: "DISABLE",
			variant: "negative",
			confirmLabel: "Disable monitoring",
			perform: async () => {
				const { disabled } = await api.disableAllIssueMonitoring();
				Notify.create({
					message: `Monitoring disabled on ${disabled} ${disabled === 1 ? "stage" : "stages"}`,
					color: "positive"
				});
			}
		}
	});
}
</script>

<style scoped lang="scss">
.issues-page__tabs {
	border-bottom: 1px solid var(--q-border);
	margin-bottom: 1rem;
}
.issues-page__investigation {
	display: grid;
	grid-template-columns: minmax(0, 1.6fr) minmax(20rem, 0.9fr);
	gap: 1rem;
	min-height: 34rem;
}
@media (max-width: 1023px) {
	.issues-page__investigation {
		grid-template-columns: 1fr;
	}
}
</style>
