<template>
	<div class="update-timing text-caption text-secondary">
		<div title="SST version and duration"
			><span>{{
				update.sstVersion
					? `SST ${update.sstVersion}`
					: "SST version unavailable"
			}}</span>
			<q-icon name="sym_r_timer" size="16px" />
			{{ duration(update.timeStarted, update.timeCompleted) }}</div
		>
		<div title="Started to finished"
			><q-icon name="sym_r_schedule" size="16px" />
			{{ timestamp(update.timeStarted) }} →
			{{ timestamp(update.timeCompleted) }}</div
		>
	</div>
</template>

<script setup lang="ts">
import type { StateUpdate } from "@sst-console/sdk";
import { duration, timestamp } from "./update-format";

defineProps<{ update: StateUpdate }>();
</script>

<style scoped>
.update-timing {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	justify-content: space-between;
	height: 100%;
	gap: 0.25rem;
	font-variant-numeric: tabular-nums;
}
.update-timing > div {
	display: flex;
	align-items: center;
	gap: 0.25rem;
}
@media (max-width: 599px) {
	.update-timing {
		align-items: flex-start;
	}
}
</style>
