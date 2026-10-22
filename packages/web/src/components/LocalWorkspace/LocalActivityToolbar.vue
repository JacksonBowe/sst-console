<template>
	<div class="row items-stretch q-gutter-sm">
		<TableSearch
			:model-value="filters.text"
			@update:model-value="updateText($event ?? '')"
		/>
		<TableFilter
			label="Status"
			:options="invocationStatusOptions"
			:model-value="filters.facets.status ?? []"
			@update:model-value="updateFacet('status', $event)"
		/>
		<TableFilter
			label="Function"
			:options="functionOptions"
			:model-value="filters.facets.function ?? []"
			searchable
			@update:model-value="updateFacet('function', $event)"
		/>
		<TableClearFilters :filters="filters" @clear-facets="clearFacets" />
		<q-space />
		<q-btn
			flat
			dense
			no-caps
			:icon="isStreaming ? 'sym_r_pause' : 'sym_r_play_arrow'"
			:label="isStreaming ? 'Pause stream' : 'Resume stream'"
			:aria-label="
				isStreaming
					? 'Pause local invocation stream'
					: 'Resume local invocation stream'
			"
			@click="$emit('toggle-stream')"
		/>
		<q-btn
			flat
			dense
			no-caps
			icon="sym_r_delete_sweep"
			label="Clear activity"
			aria-label="Clear local invocation activity"
			@click="$emit('clear')"
		/>
	</div>
</template>

<script setup lang="ts">
import type { Filters } from "@/components/ui/Table";
import {
	TableClearFilters,
	TableFilter,
	TableSearch
} from "@/components/ui/Table";
import { invocationStatusOptions } from "./invocation-filters";

const props = withDefaults(
	defineProps<{
		filters: Filters;
		functionOptions?: Array<{ label: string; value: string }>;
		isStreaming?: boolean;
	}>(),
	{ functionOptions: () => [], isStreaming: true }
);
const emit = defineEmits<{
	clear: [];
	"toggle-stream": [];
	"update:filters": [filters: Filters];
}>();

function clearFacets() {
	emit("update:filters", {
		text: props.filters.text,
		facets: Object.fromEntries(
			Object.keys(props.filters.facets).map(key => [key, []])
		)
	});
}

function updateText(text: string) {
	emit("update:filters", { ...props.filters, text });
}

function updateFacet(facet: string, values: string[]) {
	emit("update:filters", {
		...props.filters,
		facets: { ...props.filters.facets, [facet]: values }
	});
}
</script>
