<template>
	<div
		class="update-metrics text-caption text-secondary"
		:class="{ 'update-metrics--processed': update.processedAt }"
	>
		<div v-if="!update.processedAt" class="update-metrics__value text-mono">
			{{ update.updateId }}
		</div>
		<template v-else>
			<div title="Status">{{ status(update, isNewest) }}</div>
			<div class="update-metrics__value" title="SST version">
				{{
					update.sstVersion
						? `SST ${update.sstVersion}`
						: "SST unavailable"
				}}
			</div>
			<div title="Duration">
				<q-icon name="sym_r_timer" size="16px" />
				{{ duration(update.timeStarted, update.timeCompleted) }}
			</div>
			<div title="Started">
				<q-icon name="sym_r_schedule" size="16px" />
				{{ startTime(update.timeStarted) }}
			</div>
		</template>
	</div>
</template>

<script setup lang="ts">
import type { StateUpdate } from "@sst-console/sdk";
import { duration, startTime, status } from "./update-format";

defineProps<{ update: StateUpdate; isNewest: boolean }>();
</script>

<style scoped>
.update-metrics {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	height: 100%;
	gap: 0.25rem 0.75rem;
	font-variant-numeric: tabular-nums;
}
.update-metrics > div {
	display: flex;
	align-items: center;
	gap: 0.25rem;
}
.update-metrics__value {
	overflow-wrap: anywhere;
}
@media (min-width: 1024px) {
	.update-metrics--processed {
		display: grid;
		grid-template-columns: 8rem 8rem 9rem 7rem;
	}
}
</style>
