<template>
	<q-timeline layout="dense" class="update-timeline">
		<q-timeline-entry
			v-for="(update, index) in updates"
			:key="update.updateId"
			:color="statusColor(update, index === 0)"
		>
			<UpdateTimelineItem
				:update="update"
				:is-newest="index === 0"
				@select="$emit('select', update.updateId)"
			/>
		</q-timeline-entry>
	</q-timeline>
</template>

<script setup lang="ts">
import type { StateUpdate } from "@sst-console/sdk";
import UpdateTimelineItem from "./UpdateTimelineItem.vue";
import { statusColor } from "./update-format";

defineProps<{ updates: StateUpdate[] }>();
defineEmits<{ select: [updateId: string] }>();
</script>

<style scoped>
.update-timeline {
	margin: 0;
	padding: 0;
}
.update-timeline :deep(.q-timeline__content) {
	padding-bottom: 0.75rem;
}
.update-timeline :deep(.q-timeline__title),
.update-timeline :deep(.q-timeline__subtitle) {
	display: none;
}
</style>
