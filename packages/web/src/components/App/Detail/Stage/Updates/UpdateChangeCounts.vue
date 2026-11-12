<template>
	<div v-if="counts" class="row q-gutter-x-md text-body2 text-secondary">
		<span>Snapshot changes</span>
		<span
			>Created <strong>{{ counts.created }}</strong></span
		>
		<span
			>Updated <strong>{{ counts.updated }}</strong></span
		>
		<span
			>Deleted <strong>{{ counts.deleted }}</strong></span
		>
		<span
			>Unchanged <strong>{{ counts.unchanged }}</strong></span
		>
	</div>
	<div v-else class="text-body2 text-secondary"
		>Snapshot change counts unavailable</div
	>
</template>

<script setup lang="ts">
import type { StateUpdate } from "@sst-console/sdk";

defineProps<{ counts?: StateUpdate["resourceCounts"] }>();
</script>

<style scoped>
strong {
	color: var(--q-text-primary);
	font-weight: 500;
}
</style>
