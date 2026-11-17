<template>
	<q-dialog
		class="issue-filter-sheet"
		:model-value="modelValue"
		position="bottom"
		full-width
		@update:model-value="$emit('update:modelValue', $event)"
	>
		<q-card class="filters-sheet column">
			<div class="filters-sheet__content column full-width self-center">
				<q-card-section class="row items-center justify-between">
					<div class="text-h6">Filters</div>
					<q-btn
						flat
						round
						dense
						icon="sym_r_close"
						aria-label="Close filters"
						v-close-popup
					/>
				</q-card-section>
				<q-card-section class="scroll q-pb-lg">
					<IssueFilters
						display-mode="mobile"
						:issues="issues"
						:filters="filters"
						@change="$emit('change', $event)"
					/>
				</q-card-section>
			</div>
		</q-card>
	</q-dialog>
</template>

<script setup lang="ts">
import type { Issue } from "@sst-console/sdk";
import type { Filters } from "@/components/ui/Table";
import IssueFilters from "./IssueFilters.vue";

defineProps<{
	modelValue: boolean;
	issues: Issue[];
	filters: Filters;
}>();
defineEmits<{
	"update:modelValue": [value: boolean];
	change: [filters: Filters];
}>();
</script>

<style scoped>
:global(.issue-filter-sheet .q-dialog__inner) {
	padding-left: 0;
	padding-right: 0;
}
.filters-sheet {
	max-height: 85vh;
}
.filters-sheet__content {
	max-width: 440px;
	min-height: 0;
}
</style>
