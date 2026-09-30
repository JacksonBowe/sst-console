<template>
	<div class="invocation-lis column overflow-hidden">
		<q-table
			v-if="invocations.length"
			class="invocation-list__tabl col overflow-hidden"
			table-style="max-height: 100%"
			flat
			dense
			hide-bottom
			separator="none"
			virtual-scroll
			:rows="invocations"
			:columns="columns"
			:pagination="{ rowsPerPage: 0 }"
			:virtual-scroll-item-size="32"
			:virtual-scroll-sticky-size-start="34"
			row-key="id"
		>
			<template #body="tableProps">
				<InvocationListRow
					:table-props="tableProps"
					:invocation="tableProps.row"
					:active="tableProps.row.id === selectedId"
					@select="$emit('select', $event)"
				/>
			</template>
		</q-table>
		<InvocationListEmptyState v-else :status="status" />
	</div>
</template>

<script setup lang="ts">
import type { QTableColumn } from "quasar";

import type {
	LocalConnectionStatus,
	LocalInvocation,
} from "@/composables/local";
import InvocationListEmptyState from "./InvocationListEmptyState.vue";
import InvocationListRow from "./InvocationListRow.vue";

const props = defineProps<{
	invocations: LocalInvocation[];
	status: LocalConnectionStatus;
	selectedId?: string | undefined;
}>();
defineEmits<{ select: [id: string] }>();

const columns: QTableColumn[] = [
	{
		name: "time",
		label: "Time",
		field: (invocation) => invocation.start,
		align: "left",
		headerStyle: "width: 5rem",
		style: "width: 5rem",
	},
	{
		name: "source",
		label: "Function",
		field: (invocation) => invocation.source ?? "Unknown source",
		align: "left",
	},
	{
		name: "status",
		label: "Status",
		field: (invocation) => invocation.status,
		align: "left",
		headerStyle: "width: 6.5rem",
		style: "width: 6.5rem",
	},
	{
		name: "duration",
		label: "Duration",
		field: (invocation) => invocation.duration,
		align: "left",
		headerStyle: "width: 5rem",
		style: "width: 5rem",
	},
];
</script>

<!-- <style scoped lang="scss">
.invocation-list__table {
	border: 1px solid var(--q-secondary-2);
	border-radius: 6px;
	background: var(--q-secondary-3);
	overflow: hidden;

	:deep(table) {
		border-collapse: separate;
		border-spacing: 0;
	}

	:deep(thead tr th) {
		position: sticky;
		top: 0;
		z-index: 1;
		height: 2.125rem;
		padding: 0 0.75rem;
		background: var(--q-secondary-2);
		color: var(--q-text-secondary);
		font-size: 0.75rem;
		font-weight: 500;
		line-height: 1;
		letter-spacing: 0;
		text-transform: none;
	}

	:deep(tbody tr td) {
		height: 2rem;
		padding: 0 0.75rem;
		border: 0;
		box-shadow: inset 0 -1px var(--q-secondary-2);
		color: var(--q-text-primary);
		font-size: 0.75rem;
		font-weight: 400;
		line-height: 1;
	}

	:deep(tbody tr:nth-child(even) td) {
		background: var(--q-secondary-3);
	}

	:deep(tbody tr:nth-child(odd) td) {
		background: color-mix(in srgb, var(--q-secondary) 6%, transparent);
	}

	:deep(tbody tr.invocation-list-row--active td) {
		background: var(--q-primary-3);
		box-shadow:
			inset 0 1px var(--q-primary),
			inset 0 -1px var(--q-primary);
	}

	:deep(tbody tr.invocation-list-row--active td:first-child) {
		border-radius: 4px 0 0 4px;
		box-shadow:
			inset 1px 0 var(--q-primary),
			inset 0 1px var(--q-primary),
			inset 0 -1px var(--q-primary);
	}

	:deep(tbody tr.invocation-list-row--active td:last-child) {
		border-radius: 0 4px 4px 0;
		box-shadow:
			inset -1px 0 var(--q-primary),
			inset 0 1px var(--q-primary),
			inset 0 -1px var(--q-primary);
	}
}

.invocation-list__table :deep(tbody tr) {
	cursor: pointer;
}

.invocation-list__table :deep(tbody tr:focus-visible) {
	outline: 2px solid var(--q-primary);
	outline-offset: -2px;
}
</style> -->
