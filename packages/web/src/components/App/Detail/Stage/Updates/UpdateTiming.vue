<template>
	<div class="update-timing text-caption text-secondary">
		<div
			><q-icon name="sym_r_timer" size="16px" />
			{{ duration(update.timeStarted, update.timeCompleted) }}</div
		>
		<div
			><q-icon name="sym_r_schedule" size="16px" />
			{{ timestamp(update.timeStarted) }}</div
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
}
.update-timing > div {
	display: flex;
	align-items: center;
	gap: 0.25rem;
}
@media (max-width: 599px) {
	.update-timing {
		flex-direction: row;
		flex-wrap: wrap;
	}
}
</style>
