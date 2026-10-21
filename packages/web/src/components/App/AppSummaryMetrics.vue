<template>
	<div
		class="app-summary-metrics text-caption text-secondary"
		aria-label="App summary"
	>
		<span
			>{{ stageCount }} {{ stageCount === 1 ? "stage" : "stages" }}</span
		>
		<span
			>{{ accountCount }}
			{{ accountCount === 1 ? "account" : "accounts" }}</span
		>
		<span
			>{{ regionCount }}
			{{ regionCount === 1 ? "region" : "regions" }}</span
		>
		<span
			>{{ resourceCount }}
			{{ resourceCount === 1 ? "resource" : "resources" }}</span
		>
	</div>
</template>

<script setup lang="ts">
defineProps<{
	stageCount: number;
	accountCount: number;
	regionCount: number;
	resourceCount: number;
}>();
</script>

<style scoped lang="scss">
.app-summary-metrics {
	display: flex;
	flex-wrap: wrap;
	gap: 0.25rem 0.75rem;
}
</style>
