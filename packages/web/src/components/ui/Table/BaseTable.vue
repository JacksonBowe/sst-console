<template>
	<q-table
		class="base-table full-height"
		flat
		bordered
		:rows="rows"
		:columns="columns"
		:visible-columns="computedVisibleColumns"
		:rows-per-page-options="rowsPerPageOptions"
		:loading="loading"
		:filter="filters"
		:filter-method="useCustomFilter"
		:row-class="rowClass"
		v-model:pagination="internalPagination"
		@row-click="onRowClick"
	>
		<!-- Loading slot -->
		<template #loading>
			<slot name="loading">
				<q-inner-loading showing color="primary" />
			</slot>
		</template>

		<!-- No data slot -->
		<template #no-data>
			<slot name="no-data">
				<div
					v-if="!loading"
					class="fit column flex-center q-pa-lg text-muted"
				>
					<q-icon :name="emptyIcon" size="48px" class="q-mb-sm" />
					<span v-if="hasFilters">{{ emptyFilteredMessage }}</span>
					<span v-else>{{ emptyMessage }}</span>
				</div>
			</slot>
		</template>

		<!-- Pass through all body-cell slots -->
		<template
			v-for="col in columns"
			:key="col.name"
			#[`body-cell-${col.name}`]="props"
		>
			<slot :name="`body-cell-${col.name}`" v-bind="props">
				<q-td :props="props">{{ props.value }}</q-td>
			</slot>
		</template>

		<!-- Pass through header slots -->
		<template #header="props">
			<slot name="header" v-bind="props">
				<q-tr :props="props">
					<q-th
						v-for="col in props.cols"
						:key="col.name"
						:props="props"
					>
						{{ col.label }}
					</q-th>
				</q-tr>
			</slot>
		</template>

		<!-- Pass through top slot -->
		<template v-if="$slots.top" #top>
			<slot name="top" />
		</template>

		<!-- Pass through bottom slot -->
		<template v-if="$slots.bottom" #bottom>
			<slot name="bottom" />
		</template>
	</q-table>
</template>

<script setup lang="ts" generic="TRow extends object">
import { computed, ref, watch } from "vue";

import {
	hasActiveFilters,
	useCustomFilter,
	type ExtendedQTableColumn,
	type Filters
} from ".";

const props = withDefaults(
	defineProps<{
		/** Table rows data */
		rows: TRow[];
		/** Column definitions */
		columns: ExtendedQTableColumn[];
		/** Columns to show (by name). If undefined, shows all columns. */
		visibleColumns?: string[] | undefined;
		/** Whether data is loading */
		loading?: boolean | undefined;
		/** Filter state */
		filters?: Filters | undefined;
		/** Rows per page options */
		rowsPerPageOptions?: number[] | undefined;
		/** Icon to show when table is empty */
		emptyIcon?: string | undefined;
		/** Message when empty with no filters */
		emptyMessage?: string | undefined;
		/** Message when empty due to filters */
		emptyFilteredMessage?: string | undefined;
		/** Function to compute row class */
		rowClass?: ((row: TRow) => string) | undefined;
		/** Initial pagination state */
		pagination?:
			| {
					sortBy?: string;
					descending?: boolean;
					page?: number;
					rowsPerPage?: number;
			  }
			| undefined;
	}>(),
	{
		rows: () => [],
		loading: false,
		rowsPerPageOptions: () => [12],
		emptyIcon: "sym_r_inbox",
		emptyMessage: "No data available",
		emptyFilteredMessage: "No items match your filters"
	}
);

const emit = defineEmits<{
	(e: "row-click", event: Event, row: TRow, index: number): void;
}>();

// Compute whether filters are active
const hasFilters = computed(() => hasActiveFilters(props.filters));

// Compute visible columns - default to all columns if not specified
const computedVisibleColumns = computed(
	() => props.visibleColumns ?? props.columns.map(col => col.name)
);

// Internal pagination state
const internalPagination = ref({
	sortBy: props.pagination?.sortBy ?? null,
	descending: props.pagination?.descending ?? false,
	page: props.pagination?.page ?? 1,
	rowsPerPage:
		props.pagination?.rowsPerPage ?? props.rowsPerPageOptions[0] ?? 12
});

// Sync external pagination changes
watch(
	() => props.pagination,
	newPagination => {
		if (newPagination) {
			internalPagination.value = {
				...internalPagination.value,
				...newPagination
			};
		}
	},
	{ deep: true }
);

function onRowClick(event: Event, row: TRow, index: number) {
	emit("row-click", event, row, index);
}
</script>

<style scoped lang="scss">
.base-table {
	:deep(.q-table__middle:has(+ .q-table__bottom--nodata)) {
		flex: 0 0 auto;
	}

	:deep(.q-table__bottom--nodata) {
		flex: 1 1 auto;
		justify-content: center;
	}
}
</style>
