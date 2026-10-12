<template>
	<BaseTable
		:rows="issues"
		:columns="columns"
		:rows-per-page-options="[12, 24, 48]"
		:loading="loading"
		:filters="filters"
		row-key="fingerprint"
		:expanded="expanded"
		empty-icon="sym_r_error"
		empty-message="No Issues detected"
		empty-filtered-message="No Issues match these filters"
		:pagination="{ sortBy: 'lastSeenAt', descending: true }"
		@update:expanded="setExpanded"
	>
		<template #body="tableProps">
			<q-tr :props="tableProps">
				<q-td key="error" :props="tableProps">
					<div class="row items-center no-wrap">
						<q-btn
							flat
							round
							dense
							size="sm"
							:icon="
								tableProps.expand
									? 'sym_r_expand_less'
									: 'sym_r_expand_more'
							"
							:aria-label="
								tableProps.expand
									? 'Hide issue details'
									: 'Show issue details'
							"
							@click.stop="tableProps.expand = !tableProps.expand"
						/>
						<div class="text-weight-medium">
							{{ tableProps.row.errorType }}
						</div>
					</div>
					<div class="issues-table__message text-secondary">
						{{ tableProps.row.errorMessage }}
					</div>
				</q-td>

				<q-td key="stage" :props="tableProps">
					<router-link
						class="issues-table__link"
						:to="stageRoute(tableProps.row)"
					>
						{{ tableProps.row.appName }}/{{
							tableProps.row.stageName
						}}
					</router-link>
				</q-td>

				<q-td key="workload" :props="tableProps">
					<span
						class="issues-table__workload text-mono"
						:title="workloadName(tableProps.row)"
					>
						{{ workloadName(tableProps.row) }}
					</span>
				</q-td>

				<q-td key="count" :props="tableProps">
					{{ tableProps.row.count }}
				</q-td>

				<q-td
					key="lastSeenAt"
					:props="tableProps"
					:title="tableProps.row.lastSeenAt"
				>
					{{ formatDateTime(tableProps.row.lastSeenAt) }}
				</q-td>

				<q-td key="status" :props="tableProps">
					<IssueStatusChip :status="tableProps.row.status" />
				</q-td>

				<q-td key="actions" :props="tableProps" class="text-right">
					<IssueStatusActions
						:status="tableProps.row.status"
						@status="$emit('status', tableProps.row, $event)"
					/>
				</q-td>
			</q-tr>

			<q-tr v-show="tableProps.expand" :props="tableProps">
				<q-td :colspan="tableProps.cols.length">
					<div class="issues-table__details q-pa-sm">
						<div class="text-subtitle2 q-mb-xs">Error message</div>
						<CodePreview
							class="issues-table__code"
							:code="tableProps.row.errorMessage"
							label="Error message"
							mode="content"
						/>

						<template
							v-if="
								tableProps.row.stack &&
								!includesStack(
									tableProps.row.errorMessage,
									tableProps.row.stack
								)
							"
						>
							<div class="text-subtitle2 q-mt-md q-mb-xs"
								>Stack trace</div
							>
							<CodePreview
								class="issues-table__code"
								:code="tableProps.row.stack"
								label="Stack trace"
								mode="content"
							/>
						</template>

						<div
							class="issues-table__source text-caption text-secondary q-mt-md"
						>
							<div>Log group: {{ tableProps.row.logGroup }}</div>
							<div
								>Log stream: {{ tableProps.row.logStream }}</div
							>
						</div>
					</div>
				</q-td>
			</q-tr>
		</template>
	</BaseTable>
</template>

<script setup lang="ts">
import type { Issue, IssueStatus } from "@sst-console/sdk";
import { ref } from "vue";

import { formatDateTime } from "@/components/ui/format";
import CodePreview from "@/components/ui/CodePreview/CodePreview.vue";
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

const expanded = ref<string[]>([]);

function setExpanded(next: ReadonlyArray<string | number>) {
	expanded.value =
		next.length > expanded.value.length ? [String(next.at(-1))] : [];
}

function includesStack(errorMessage: string, stack: string) {
	return errorMessage.includes(stack);
}

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

.issues-table__details {
	max-width: 100%;
}

.issues-table__source {
	overflow-wrap: anywhere;
}

@media (max-width: 599px) {
	.issues-table__message,
	.issues-table__workload {
		max-width: 12rem;
	}
}
</style>
