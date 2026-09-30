<template>
	<div class="row items-center">
		<table-search
			:model-value="text"
			@update:model-value="$emit('update:text', $event ?? '')"
		/>
		<TableFilter
			label="Status"
			:options="invocationStatusOptions"
			:model-value="statuses"
			@update:model-value="$emit('update:statuses', $event)"
		/>
		<q-space />
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
import { TableFilter, TableSearch } from "@/components/ui/Table";
import { invocationStatusOptions } from "./invocation-filters";

defineProps<{
	text: string;
	statuses: string[];
}>();
defineEmits<{
	clear: [];
	"update:text": [text: string];
	"update:statuses": [statuses: string[]];
}>();
</script>
