<template>
	<div
		v-if="counts && (counts.created || counts.updated || counts.deleted)"
		class="change-summary text-body2 text-weight-medium text-mono"
		role="group"
		aria-label="Resource changes"
	>
		<span
			v-if="counts.created"
			role="img"
			class="change-summary__count text-positive"
			:aria-label="`${counts.created} created`"
			>+{{ counts.created }}<q-tooltip>Created</q-tooltip></span
		>
		<span
			v-if="counts.updated"
			role="img"
			class="change-summary__count text-warning"
			:aria-label="`${counts.updated} updated`"
			>~{{ counts.updated }}<q-tooltip>Updated</q-tooltip></span
		>
		<span
			v-if="counts.deleted"
			role="img"
			class="change-summary__count text-negative"
			:aria-label="`${counts.deleted} deleted`"
			>−{{ counts.deleted }}<q-tooltip>Deleted</q-tooltip></span
		>
	</div>
	<div v-else-if="counts" class="text-body2 text-secondary">No changes</div>
	<div v-else class="text-body2 text-secondary">Changes unavailable</div>
</template>

<script setup lang="ts">
import type { StateUpdate } from "@sst-console/sdk";

defineProps<{ counts?: StateUpdate["resourceCounts"] }>();
</script>

<style scoped>
.change-summary {
	display: inline-flex;
	align-items: center;
	gap: 0.65rem;
	white-space: nowrap;
}
.change-summary__count {
	font-variant-numeric: tabular-nums;
}
</style>
