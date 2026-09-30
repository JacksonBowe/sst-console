<template>
	<div
		class="invocation-list-row row no-wrap items-center q-px-md q-py-sm"
		:class="{ 'invocation-list-row--active': active }"
		:aria-label="rowLabel"
		:aria-selected="active"
		role="listitem"
		tabindex="0"
		@click="$emit('select', invocation.id)"
		@keydown.enter.prevent="$emit('select', invocation.id)"
		@keydown.space.prevent="$emit('select', invocation.id)"
	>
		<div class="col-2 invocation-list-row__time">
			{{ formatTime(invocation.start) }}
		</div>
		<div class="col invocation-list-row__source ellipsis">
			<span>{{ sourceName }}</span>
			<span v-if="httpLabel" class="invocation-list-row__http">
				{{ httpLabel }}
			</span>
		</div>
		<div class="col-2 invocation-list-row__status">
			<div
				class="row items-center no-wrap justify-end q-pr-md q-gutter-xs"
			>
				<span
					class="invocation-list-row__status-dot"
					:class="`bg-${statusColor}`"
				/>
				<span>{{ statusLabel }}</span>
			</div>
		</div>
		<div class="col-1 text-right invocation-list-row__duration">
			{{ durationLabel }}
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";

import type { LocalInvocation } from "@/composables/local";

const props = defineProps<{
	invocation: LocalInvocation;
	active: boolean;
}>();
defineEmits<{ select: [id: string] }>();

const sourceName = computed(
	() => props.invocation.source?.split("::").at(-1) ?? "Unknown source"
);
const httpLabel = computed(() => {
	if (!props.invocation.http) return undefined;
	return `(${props.invocation.http.method} ${props.invocation.http.path})`;
});
const statusLabel = computed(
	() =>
		({ pending: "Running", success: "Success", error: "Error" })[
			props.invocation.status
		]
);
const statusColor = computed(
	() =>
		({ pending: "warning", success: "positive", error: "negative" })[
			props.invocation.status
		]
);
const durationLabel = computed(() =>
	props.invocation.duration === undefined
		? "—"
		: `${props.invocation.duration}ms`
);
const rowLabel = computed(() =>
	[sourceName.value, httpLabel.value, statusLabel.value]
		.filter(Boolean)
		.join(", ")
);

function formatTime(timestamp: number) {
	return new Date(timestamp).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit"
	});
}
</script>

<style scoped lang="scss">
.invocation-list-row {
	height: 2rem;
	padding: 0 0.75rem;
	box-shadow: inset 0 -1px var(--q-secondary-2);
	cursor: pointer;
	font-size: 0.75rem;
	font-weight: 400;
}

.invocation-list-row--active {
	background: var(--q-primary-3) !important;
	box-shadow: inset 0 0 0 1px var(--q-primary);
	border-radius: 4px;
}

.invocation-list-row:focus-visible {
	outline: 2px solid var(--q-focus-ring);
	outline-offset: -2px;
}

.invocation-list-row__time,
.invocation-list-row__duration {
	color: var(--q-text-secondary) !important;
	font-variant-numeric: tabular-nums;
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
</style>
