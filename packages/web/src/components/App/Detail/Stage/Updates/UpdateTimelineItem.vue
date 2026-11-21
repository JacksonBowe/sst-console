<template>
	<q-item
		clickable
		:disable="processing || queued || blocked"
		class="update-item q-px-md q-py-sm"
		:title="status(update, isNewest)"
		@click="$emit('select')"
	>
		<q-item-section>
			<div v-if="!update.processedAt" class="text-body2">
				{{
					processing
						? "Queuing for processing…"
						: queued
							? "Queued for processing."
							: blocked
								? "Waiting for current request…"
								: "Update not processed yet - select to process."
				}}
			</div>
			<div v-else class="update-item__content">
				<span
					class="update-item__command text-weight-medium text-mono"
					>{{ update.command || "Command unavailable" }}</span
				>
				<UpdateChangeCounts :counts="update.resourceCounts" />
			</div>
		</q-item-section>
		<q-item-section side class="update-item__timing">
			<UpdateMetrics :update="update" :is-newest="isNewest" />
		</q-item-section>
	</q-item>
</template>

<script setup lang="ts">
import type { StateUpdate } from "@sst-console/sdk";
import UpdateChangeCounts from "./UpdateChangeCounts.vue";
import UpdateMetrics from "./UpdateMetrics.vue";
import { status } from "./update-format";

defineProps<{
	update: StateUpdate;
	isNewest: boolean;
	processing?: boolean;
	queued?: boolean;
	blocked?: boolean;
}>();
defineEmits<{ select: [] }>();
</script>

<style scoped lang="scss">
.update-item {
	border: 1px solid color-mix(in srgb, var(--q-border) 65%, transparent);
	border-radius: $generic-border-radius;
	min-width: 0;
	transition:
		background 0.15s,
		border-color 0.15s;
}
.update-item:hover {
	background: var(--q-secondary-2);
	border-color: var(--q-primary);
}
.update-item:focus-visible {
	border-color: var(--q-primary);
}
.update-item__content {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 0.5rem 1rem;
	min-width: 0;
}
.update-item__command {
	overflow-wrap: anywhere;
}
.update-item__timing {
	align-self: stretch;
}
@media (max-width: 599px) {
	.update-item {
		flex-direction: column;
	}
	.update-item__timing {
		padding-left: 0;
		padding-top: 0.5rem;
	}
}
</style>
