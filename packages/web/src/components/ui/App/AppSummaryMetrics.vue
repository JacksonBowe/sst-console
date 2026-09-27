<template>
	<div class="app-summary-metrics" aria-label="App summary">
		<div class="app-summary-metrics__item">
			<span class="app-summary-metrics__value">{{ stageCount }}</span>
			<span class="app-summary-metrics__label">Stages</span>
		</div>
		<div class="app-summary-metrics__item">
			<span class="app-summary-metrics__value">{{ accountCount }}</span>
			<span class="app-summary-metrics__label">Accounts</span>
		</div>
		<div class="app-summary-metrics__item">
			<span class="app-summary-metrics__value">{{ regionCount }}</span>
			<span class="app-summary-metrics__label">Regions</span>
		</div>
		<div class="app-summary-metrics__item">
			<span class="app-summary-metrics__value">{{ resourceCount }}</span>
			<span class="app-summary-metrics__label">Resources</span>
		</div>
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
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	border-block: 1px solid var(--q-border);
	padding-block: 0.75rem;
}

.app-summary-metrics__item {
	display: flex;
	flex-direction: column;
	gap: 0.125rem;
	min-width: 0;
	padding-inline: 0.75rem;
}

.app-summary-metrics__item + .app-summary-metrics__item {
	border-left: 1px solid var(--q-border);
}

.app-summary-metrics__item:first-child {
	padding-left: 0;
}

.app-summary-metrics__item:last-child {
	padding-right: 0;
}

.app-summary-metrics__value {
	color: var(--q-text-primary);
	font-size: 1rem;
	font-weight: 650;
}

.app-summary-metrics__label {
	color: var(--q-text-secondary);
	font-size: 0.75rem;
}
</style>
