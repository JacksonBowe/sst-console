<template>
	<q-timeline layout="dense" class="update-timeline">
		<q-timeline-entry
			v-for="entry in entries"
			:key="entry.update.updateId"
			:color="statusColor(entry.update, entry.isNewest)"
		>
			<div
				v-if="entry.heading"
				class="update-timeline__date text-subtitle2 text-secondary"
			>
				{{ entry.heading }}
			</div>
			<UpdateTimelineItem
				:update="entry.update"
				:is-newest="entry.isNewest"
				@select="$emit('select', entry.update.updateId)"
			/>
		</q-timeline-entry>
	</q-timeline>
</template>

<script setup lang="ts">
import type { StateUpdate } from "@sst-console/sdk";
import { computed } from "vue";
import { formatDate } from "@/components/ui/format";
import UpdateTimelineItem from "./UpdateTimelineItem.vue";
import { statusColor } from "./update-format";

const props = defineProps<{ updates: StateUpdate[] }>();
defineEmits<{ select: [updateId: string] }>();

const entries = computed(() => {
	const today = new Date();
	const yesterday = new Date(
		today.getFullYear(),
		today.getMonth(),
		today.getDate() - 1
	);
	const sorted = props.updates
		.map((update, index) => {
			const time = update.timeStarted
				? Date.parse(update.timeStarted)
				: NaN;
			return { update, index, time };
		})
		.sort((a, b) => {
			if (Number.isNaN(a.time))
				return Number.isNaN(b.time) ? a.index - b.index : 1;
			if (Number.isNaN(b.time)) return -1;
			return b.time - a.time || a.index - b.index;
		});
	let previousDate = "";
	return sorted.map(({ update, index, time }) => {
		const date = Number.isNaN(time) ? undefined : new Date(time);
		const dateKey = date?.toDateString() ?? "unavailable";
		const heading =
			dateKey === previousDate
				? undefined
				: !date
					? "Date unavailable"
					: dateKey === today.toDateString()
						? "Today"
						: dateKey === yesterday.toDateString()
							? "Yesterday"
							: formatDate(date);
		previousDate = dateKey;
		return { update, isNewest: index === 0, heading };
	});
});
</script>

<style scoped>
.update-timeline {
	margin: 0;
	padding: 0;
}
.update-timeline :deep(.q-timeline__content) {
	padding-bottom: 0.75rem;
}
.update-timeline__date {
	margin-bottom: 0.5rem;
}
.update-timeline :deep(.q-timeline__title),
.update-timeline :deep(.q-timeline__subtitle) {
	display: none;
}
</style>
