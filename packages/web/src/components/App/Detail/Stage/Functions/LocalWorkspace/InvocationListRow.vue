<template>
	<q-tr
		:props="tableProps"
		:class="{ 'invocation-list-row--active': active }"
		:aria-label="rowLabel"
		:aria-selected="active"
		tabindex="0"
		@click="$emit('select', invocation.id)"
		@keydown.enter.prevent="$emit('select', invocation.id)"
		@keydown.space.prevent="$emit('select', invocation.id)"
	>
		<q-td key="time" :props="tableProps" class="invocation-list-row__time">
			{{ formatTime(invocation.start) }}
		</q-td>
		<q-td
			key="source"
			:props="tableProps"
			class="invocation-list-row__source"
		>
			<span>{{ sourceName }}</span>
			<span v-if="httpLabel" class="invocation-list-row__http">
				{{ httpLabel }}
			</span>
		</q-td>
		<q-td
			key="status"
			:props="tableProps"
			class="invocation-list-row__status"
		>
			<div class="row items-center no-wrap q-gutter-xs">
				<span
					class="invocation-list-row__status-dot"
					:class="`bg-${statusColor}`"
				/>
				<span>{{ statusLabel }}</span>
			</div>
		</q-td>
		<q-td
			key="duration"
			:props="tableProps"
			class="invocation-list-row__duration"
		>
			{{ durationLabel }}
		</q-td>
	</q-tr>
</template>

<script setup lang="ts">
import { computed } from "vue";

import type { LocalInvocation } from "@/composables/local";

type TableProps = { row: LocalInvocation; [key: string]: unknown };

const props = defineProps<{
	invocation: LocalInvocation;
	active: boolean;
	tableProps: TableProps;
}>();
defineEmits<{ select: [id: string] }>();

const sourceName = computed(
	() => props.invocation.source?.split("::").at(-1) ?? "Unknown source",
);
const httpLabel = computed(() => {
	if (!props.invocation.http) return undefined;
	return `(${props.invocation.http.method} ${props.invocation.http.path})`;
});
const statusLabel = computed(
	() =>
		({ pending: "Running", success: "Success", error: "Error" })[
			props.invocation.status
		],
);
const statusColor = computed(
	() =>
		({ pending: "warning", success: "positive", error: "negative" })[
			props.invocation.status
		],
);
const durationLabel = computed(() =>
	props.invocation.duration === undefined
		? "—"
		: `${props.invocation.duration}ms`,
);
const rowLabel = computed(() =>
	[sourceName.value, httpLabel.value, statusLabel.value]
		.filter(Boolean)
		.join(", "),
);

function formatTime(timestamp: number) {
	return new Date(timestamp).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
}
</script>

<!-- <style scoped lang="scss">
.invocation-list-row--active {
	color: var(--q-text-primary);
}

.invocation-list-row__time,
.invocation-list-row__duration {
	color: var(--q-text-secondary) !important;
	font-variant-numeric: tabular-nums;
}

.invocation-list-row__source {
	white-space: nowrap;
}

.invocation-list-row__http {
	margin-left: 0.25rem;
	color: var(--q-text-secondary);
}

.invocation-list-row__status {
	color: var(--q-text-secondary) !important;
}

.invocation-list-row__status-dot {
	width: 0.375rem;
	height: 0.375rem;
	border-radius: 50%;
}
</style> -->
