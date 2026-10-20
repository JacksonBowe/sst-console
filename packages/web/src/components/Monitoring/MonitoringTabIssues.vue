<template>
	<DashboardPageContent>
		<div class="row q-gutter-md text-body2 text-secondary">
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
		<div v-else class="monitoring-tab-issues__investigation">
			<IssuesTable
				:issues="issues"
				:loading="issuesQuery.isPending.value"
				:filters="tableFilters"
				:selected-fingerprint="selectedIssue?.fingerprint"
				@select="selectedIssue = $event"
				@status="setIssueStatus"
			/>
			<IssueDetailPanel
				:issue="selectedIssue"
				@status="selectedIssue && setIssueStatus(selectedIssue, $event)"
			/>
		</div>
	</DashboardPageContent>
</template>

<script setup lang="ts">
import type { Issue, IssueStatus } from "@sst-console/sdk";
import { computed, reactive, ref } from "vue";
import { useRoute } from "vue-router";

import {
	IssueDetailPanel,
	IssuesListErrorState,
	IssuesTable
} from "@/components/Issues";
import { DashboardPageContent } from "@/components/ui/Dashboard";
import {
	TableClearFilters,
	TableFilter,
	TableSearch,
	TableToolbar,
	type Filters
} from "@/components/ui/Table";
import { useApps } from "@/composables/apps";
import { useIssues, useSetIssueStatus } from "@/composables/issues";

const route = useRoute();
const issuesQuery = useIssues({});
const appsQuery = useApps();
const setIssueStatusMutation = useSetIssueStatus();
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
function setIssueStatus(issue: Issue, status: IssueStatus) {
	setIssueStatusMutation.mutate({ issue, status });
}
</script>

<style scoped lang="scss">
.monitoring-tab-issues__investigation {
	display: grid;
	grid-template-columns: minmax(0, 1.6fr) minmax(20rem, 0.9fr);
	gap: 1rem;
	min-height: 34rem;
}

@media (max-width: 1023px) {
	.monitoring-tab-issues__investigation {
		grid-template-columns: 1fr;
	}
}
</style>
