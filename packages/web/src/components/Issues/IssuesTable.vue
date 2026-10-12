<template>
	<BaseTable
		:rows="issues"
		:columns="columns"
		:rows-per-page-options="[12, 24, 48]"
		:loading="loading"
		:filters="filters"
		empty-icon="sym_r_error"
		empty-message="No Issues detected"
		empty-filtered-message="No Issues match these filters"
		:pagination="{ sortBy: 'lastSeenAt', descending: true }"
	>
		<template #body-cell-error="tableProps">
			<q-td :props="tableProps">
				<div class="text-weight-medium">
					{{ tableProps.row.errorType }}
				</div>
				<div class="issues-table__message text-secondary">
					{{ tableProps.row.errorMessage }}
				</div>
			</q-td>
		</template>

		<template #body-cell-stage="tableProps">
			<q-td :props="tableProps">
				<router-link
					class="issues-table__link"
					:to="stageRoute(tableProps.row)"
				>
					{{ tableProps.row.appName }}/{{ tableProps.row.stageName }}
				</router-link>
			</q-td>
		</template>

		<template #body-cell-workload="tableProps">
			<q-td :props="tableProps">
				<span
					class="issues-table__workload text-mono"
					:title="workloadName(tableProps.row)"
				>
					{{ workloadName(tableProps.row) }}
				</span>
			</q-td>
		</template>

		<template #body-cell-lastSeenAt="tableProps">
			<q-td :props="tableProps" :title="tableProps.row.lastSeenAt">
				{{ formatDateTime(tableProps.row.lastSeenAt) }}
			</q-td>
		</template>

		<template #body-cell-status="tableProps">
			<q-td :props="tableProps">
				<IssueStatusChip :status="tableProps.row.status" />
			</q-td>
		</template>

		<template #body-cell-actions="tableProps">
			<q-td :props="tableProps" class="text-right">
				<IssueStatusActions
					:status="tableProps.row.status"
					@status="$emit('status', tableProps.row, $event)"
				/>
			</q-td>
		</template>
	</BaseTable>
</template>

<script setup lang="ts">
import type { Issue, IssueStatus } from "@sst-console/sdk";

import { formatDateTime } from "@/components/ui/format";
import {
	BaseTable,
	type ExtendedQTableColumn,
	type Filters
} from "@/components/ui/Table";

import IssueStatusActions from "./IssueStatusActions.vue";
import IssueStatusChip from "./IssueStatusChip.vue";

withDefaults(
	defineProps<{
		issues: Issue[];
		loading?: boolean;
		filters?: Filters;
	}>(),
	{ loading: false }
);

defineEmits<{ status: [issue: Issue, status: IssueStatus] }>();

const columns: ExtendedQTableColumn[] = [
	{
		name: "error",
		label: "Error",
		field: row => `${row.errorType} ${row.errorMessage}`,
		align: "left",
		sortable: true
	},
	{
		name: "stage",
		label: "App / Stage",
		field: row => `${row.appName}/${row.stageName}`,
		align: "left",
		sortable: true
	},
	{
		name: "workload",
		label: "Workload",
		field: workloadName,
		align: "left",
		sortable: true
	},
	{
		name: "count",
		label: "Occurrences",
		field: "count",
		align: "right",
		sortable: true
	},
	{
		name: "lastSeenAt",
		label: "Last seen",
		field: "lastSeenAt",
		align: "left",
		sortable: true
	},
	{
		name: "status",
		label: "Status",
		field: "status",
		align: "left",
		sortable: true
	},
	{
		name: "actions",
		label: "Actions",
		field: () => "",
		align: "right"
	}
];

function workloadName(issue: Issue) {
	return issue.functionName ?? issue.logGroup;
}

function stageRoute(issue: Issue) {
	return {
		name: "stage-detail",
		params: { appName: issue.appName, stageName: issue.stageName }
	};
}
</script>

<style scoped lang="scss">
.issues-table__link {
	color: var(--q-primary);
	text-decoration: none;
}

.issues-table__link:hover {
	text-decoration: underline;
}

.issues-table__message,
.issues-table__workload {
	display: block;
	max-width: 24rem;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

@media (max-width: 599px) {
	.issues-table__message,
	.issues-table__workload {
		max-width: 12rem;
	}
}
</style>
