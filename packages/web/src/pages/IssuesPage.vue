<template>
	<DashboardPage>
		<DashboardPageHeader
			title="Issues"
			subtitle="Detected workload failures"
		>
			<template #actions>
				<q-btn
					flat
					no-caps
					color="negative"
					label="Disable monitoring"
					@click="confirmDisableAllMonitoring"
				/>
				<q-btn
					flat
					no-caps
					label="Test query"
					:loading="testing"
					@click="testQuery"
				/>
				<q-btn
					flat
					no-caps
					color="negative"
					label="Delete all"
					@click="confirmPurge"
				/>
			</template>
		</DashboardPageHeader>

		<DashboardPageContent>
			<TableToolbar class="q-mb-md">
				<template #search>
					<TableSearch v-model="tableFilters.text" />
				</template>
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
			<IssuesTable
				v-else
				:issues="issues"
				:loading="issuesQuery.isPending.value"
				:filters="tableFilters"
				@status="setStatus"
				class="col"
			/>
		</DashboardPageContent>
	</DashboardPage>
</template>

<script setup lang="ts">
import type { Issue, IssueStatus } from "@sst-console/sdk";
import { Dialog, Notify } from "quasar";
import { computed, reactive, ref } from "vue";

import { api, handleApiError } from "@/boot/api-client";
import { IssuesListErrorState, IssuesTable } from "@/components/Issues";
import {
	DashboardPage,
	DashboardPageContent,
	DashboardPageHeader
} from "@/components/ui/Dashboard";
import { DialogConfirm } from "@/components/ui/Dialog";
import {
	TableClearFilters,
	TableFilter,
	TableSearch,
	TableToolbar,
	type Filters
} from "@/components/ui/Table";
import { useIssues } from "@/composables/issues";

const testing = ref(false);
const issuesQuery = useIssues({});
const issues = computed(() =>
	[...(issuesQuery.data.value ?? [])].sort((left, right) =>
		right.lastSeenAt.localeCompare(left.lastSeenAt)
	)
);
const tableFilters = reactive<Filters>({
	text: "",
	facets: {
		appName: [],
		stageName: [],
		status: []
	}
});
const statusOptions: Array<{ label: string; value: IssueStatus }> = [
	{ label: "Open", value: "open" },
	{ label: "Resolved", value: "resolved" },
	{ label: "Suppressed", value: "suppressed" }
];

const appOptions = computed(() => filterOptions(issues.value, "appName"));
const stageOptions = computed(() => filterOptions(issues.value, "stageName"));

function clearFacets() {
	tableFilters.facets.appName = [];
	tableFilters.facets.stageName = [];
	tableFilters.facets.status = [];
}

function filterOptions(issues: Issue[], field: "appName" | "stageName") {
	return [...new Set(issues.map(issue => issue[field]))]
		.sort()
		.map(value => ({ label: value, value }));
}

async function setStatus(issue: Issue, status: IssueStatus) {
	try {
		await api.setIssueStatus(issue, status);
		await issuesQuery.refetch();
	} catch (error) {
		handleApiError(error);
	}
}

async function testQuery() {
	testing.value = true;
	try {
		await api.testIssueQuery();
		Notify.create({
			message: "Issue test query triggered",
			color: "positive"
		});
	} catch (error) {
		handleApiError(error);
	} finally {
		testing.value = false;
	}
}

function confirmPurge() {
	Dialog.create({
		component: DialogConfirm,
		componentProps: {
			title: "Delete all Issues",
			message: "This permanently deletes every persisted Issue.",
			validationString: "DELETE",
			variant: "negative",
			confirmLabel: "Delete all",
			perform: async () => {
				await api.purgeIssues();
				await issuesQuery.refetch();
			}
		}
	});
}

function confirmDisableAllMonitoring() {
	Dialog.create({
		component: DialogConfirm,
		componentProps: {
			title: "Disable Issue monitoring",
			message:
				"This disables Issue monitoring on every monitored Stage. Existing log subscriptions are removed asynchronously.",
			validationString: "DISABLE",
			variant: "negative",
			confirmLabel: "Disable monitoring",
			perform: async () => {
				const { disabled } = await api.disableAllIssueMonitoring();
				Notify.create({
					message: `Monitoring disabled on ${disabled} ${disabled === 1 ? "Stage" : "Stages"}`,
					color: "positive"
				});
			}
		}
	});
}
</script>
