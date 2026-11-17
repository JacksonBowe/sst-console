<template>
	<DashboardPageContent class="issues-content">
		<IssueMetrics :metrics="metrics" />
		<div class="issues-workspace col row no-wrap q-gutter-x-md">
			<q-card
				v-if="$q.screen.gt.sm"
				flat
				bordered
				class="col-2 q-pa-md scroll"
			>
				<IssueFilters
					display-mode="desktop"
					:issues="issues"
					:filters="tableFilters"
					@change="updateFilters"
				/>
			</q-card>
			<div
				class="issues-workspace__list column"
				:class="
					$q.screen.gt.sm ? 'col-4' : $q.screen.xs ? 'col' : 'col-5'
				"
			>
				<div class="row no-wrap items-stretch q-gutter-sm q-mb-md">
					<div class="col">
						<SInput
							:model-value="tableFilters.text"
							@update:model-value="
								tableFilters.text = String($event ?? '')
							"
							clearable
							clear-icon="sym_r_clear"
							placeholder="Search issues"
							aria-label="Search issues"
						>
							<template #prepend
								><q-icon name="sym_r_search"
							/></template>
						</SInput>
					</div>
					<IssueFilterButton
						v-if="!$q.screen.gt.sm"
						:active="hasFacetFilters"
						@click="filtersOpen = true"
					/>
				</div>
				<IssueList
					:issues="filteredIssues"
					:selected="selectedIssue"
					:loading="issuesQuery.isPending.value"
					:error="issuesQuery.isError.value"
					:filtered="hasFilters"
					@select="selectIssue"
					@retry="issuesQuery.refetch()"
				/>
			</div>
			<div
				v-if="!$q.screen.lt.sm"
				class="issues-workspace__detail col scroll"
			>
				<IssueDetailPanel
					class="full-height overflow-hidden"
					:issue="selectedIssue"
					@status="
						selectedIssue && setIssueStatus(selectedIssue, $event)
					"
				/>
			</div>
		</div>
		<IssueFilterSheet
			v-model="filtersOpen"
			:issues="issues"
			:filters="tableFilters"
			@change="updateFilters"
		/>
		<IssueDetailDrawer
			v-model="detailOpen"
			:issue="selectedIssue"
			@status="selectedIssue && setIssueStatus(selectedIssue, $event)"
		/>
	</DashboardPageContent>
</template>

<script setup lang="ts">
import { DashboardPageContent } from "@/components/ui/Dashboard";
import { SInput } from "@/components/ui/Input";
import { hasActiveFilters, type Filters } from "@/components/ui/Table";
import { useApps } from "@/composables/apps";
import { useIssues, useSetIssueStatus } from "@/composables/issues";
import type { Issue, IssueStatus } from "@sst-console/sdk";
import { useQuasar } from "quasar";
import { computed, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { IssueDetailPanel } from "./Issues";
import IssueDetailDrawer from "./Issues/IssueDetailDrawer.vue";
import IssueFilterButton from "./Issues/IssueFilterButton.vue";
import IssueFilterSheet from "./Issues/IssueFilterSheet.vue";
import IssueFilters from "./Issues/IssueFilters.vue";
import IssueList from "./Issues/IssueList.vue";
import IssueMetrics from "./Issues/IssueMetrics.vue";
import { filterIssues } from "./Issues/issue-filters";

const $q = useQuasar();
const route = useRoute();
const issuesQuery = useIssues({});
const appsQuery = useApps();
const setIssueStatusMutation = useSetIssueStatus();
const selectedKey = ref<{
	appName: string;
	stageName: string;
	fingerprint: string;
}>();
const filtersOpen = ref(false);
const detailOpen = ref(false);
const tableFilters = reactive<Filters>({
	text: "",
	facets: {
		appName: [route.query.app]
			.flat()
			.flatMap(value => (value == null ? [] : [value])),
		stageName: [route.query.stage]
			.flat()
			.flatMap(value => (value == null ? [] : [value])),
		status:
			route.query.status === undefined
				? ["open"]
				: [route.query.status]
						.flat()
						.flatMap(value => (value == null ? [] : [value]))
						.slice(0, 1)
	}
});
const issues = computed(() =>
	[...(issuesQuery.data.value ?? [])].sort((a, b) => {
		const statusOrder =
			Number(b.status === "open") - Number(a.status === "open");
		return statusOrder || b.lastSeenAt.localeCompare(a.lastSeenAt);
	})
);
const filteredIssues = computed(() => filterIssues(issues.value, tableFilters));
const selectedIssue = computed(() =>
	filteredIssues.value.find(
		issue =>
			issue.appName === selectedKey.value?.appName &&
			issue.stageName === selectedKey.value?.stageName &&
			issue.fingerprint === selectedKey.value?.fingerprint
	)
);
watch(selectedIssue, issue => {
	if (!issue) {
		selectedKey.value = undefined;
		detailOpen.value = false;
	}
});
const hasFilters = computed(() => hasActiveFilters(tableFilters));
const hasFacetFilters = computed(() =>
	hasActiveFilters(tableFilters, { facetsOnly: true })
);
const openIssues = computed(() =>
	filterIssues(issues.value, {
		...tableFilters,
		facets: { ...tableFilters.facets, status: ["open"] }
	})
);
const monitoredStageCount = computed(
	() =>
		appsQuery.data.value
			?.flatMap(app => app.stages)
			.filter(stage => stage.issueMonitoringEnabled).length ?? 0
);
const metrics = computed(() => [
	{
		label: "Open issues",
		value:
			issuesQuery.isPending.value || issuesQuery.isError.value
				? "—"
				: openIssues.value.length,
		icon: "sym_r_warning"
	},
	{
		label: "Open occurrences",
		value:
			issuesQuery.isPending.value || issuesQuery.isError.value
				? "—"
				: openIssues.value.reduce(
						(total, issue) => total + issue.count,
						0
					),
		icon: "sym_r_monitoring"
	},
	{
		label: "Monitored stages (global)",
		value:
			appsQuery.isPending.value || appsQuery.isError.value
				? "—"
				: monitoredStageCount.value,
		icon: "sym_r_layers"
	}
]);
const updateFilters = (filters: Filters) => {
	tableFilters.facets = { ...filters.facets };
};
const selectIssue = (issue: Issue) => {
	selectedKey.value = {
		appName: issue.appName,
		stageName: issue.stageName,
		fingerprint: issue.fingerprint
	};
	if ($q.screen.lt.sm) detailOpen.value = true;
};
const setIssueStatus = (issue: Issue, status: IssueStatus) => {
	setIssueStatusMutation.mutate({ issue, status });
};
</script>

<style scoped>
.issues-content {
	min-height: 0;
}
.issues-workspace {
	min-width: 0;
	min-height: 0;
}
.issues-workspace__list,
.issues-workspace__detail {
	min-width: 0;
}
.issues-workspace__list {
	min-height: 0;
}
.issues-workspace__detail {
	min-height: 0;
}
</style>
