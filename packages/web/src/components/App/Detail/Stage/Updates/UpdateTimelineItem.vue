<template>
	<q-item
		clickable
		class="update-item q-px-md q-py-sm"
		:title="status(update, isNewest)"
		@click="$emit('select')"
	>
		<q-item-section class="q-gutter-y-xs">
			<div class="row items-center q-gutter-x-sm">
				<span class="text-weight-medium">{{
					update.command || "Command unavailable"
				}}</span>
				<span class="update-item__status">{{
					status(update, isNewest)
				}}</span>
			</div>
			<UpdateChangeCounts :counts="update.resourceCounts" />
			<div class="update-item__id text-caption text-secondary">{{
				update.updateId
			}}</div>
		</q-item-section>
		<q-item-section side class="update-item__timing">
			<UpdateTiming :update="update" />
		</q-item-section>
	</q-item>
</template>

<script setup lang="ts">
import type { StateUpdate } from "@sst-console/sdk";
import UpdateChangeCounts from "./UpdateChangeCounts.vue";
import UpdateTiming from "./UpdateTiming.vue";
import { status } from "./update-format";

defineProps<{ update: StateUpdate; isNewest: boolean }>();
defineEmits<{ select: [] }>();
</script>

<style scoped lang="scss">
.update-item {
	border: 1px solid var(--q-border);
	border-radius: $generic-border-radius;
	transition:
		background 0.15s,
		border-color 0.15s;
}
.update-item:hover {
	background: var(--q-secondary-2);
	border-color: var(--q-primary);
}
.update-item__id {
	overflow-wrap: anywhere;
}
.update-item__status {
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	margin: -1px;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
}
.update-item__timing {
	align-self: stretch;
}
@media (max-width: 599px) {
	.update-item {
		flex-wrap: wrap;
	}
	.update-item__timing {
		width: 100%;
		padding-left: 0;
		padding-top: 0.5rem;
	}
}
</style>
