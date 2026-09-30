<template>
	<div class="row items-stretch q-gutter-sm">
		<TableSearch
			:model-value="text"
			@update:model-value="$emit('update:text', $event ?? '')"
		/>
		<TableFilter
			label="Status"
			:options="invocationStatusOptions"
			:model-value="statuses"
			@update:model-value="$emit('update:statuses', $event)"
			menu-width="narrow"
		/>
		<TableClearFilters
			:filters="{ text, facets: { status: statuses } }"
			@clear-facets="$emit('update:statuses', [])"
		/>
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
import {
	TableClearFilters,
	TableFilter,
	TableSearch
} from "@/components/ui/Table";
import { invocationStatusOptions } from "./invocation-filters";

withDefaults(
	defineProps<{
		text: string;
		statuses: string[];
		isStreaming?: boolean;
	}>(),
	{ isStreaming: true }
);
defineEmits<{
	clear: [];
	"toggle-stream": [];
	"update:text": [text: string];
	"update:statuses": [statuses: string[]];
}>();
</script>
