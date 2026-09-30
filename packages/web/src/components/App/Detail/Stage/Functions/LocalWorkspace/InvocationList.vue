<template>
	<div class="invocation-list column full-height overflow-hidden">
		<div
			v-if="filteredInvocations.length"
			class="column full-height overflow-hidden"
		>
			<div
				class="invocation-list__header row no-wrap items-center"
				role="row"
			>
				<div class="col-2" role="columnheader">Time</div>
				<div class="col" role="columnheader">Function</div>
				<div class="col-2 q-pr-md text-right" role="columnheader"
					>Status</div
				>
				<div class="col-1 text-right" role="columnheader">Duration</div>
			</div>
			<q-separator />
			<q-scroll-area
				class="col"
				:vertical-bar-style="{ width: '6px' }"
				:vertical-thumb-style="{ width: '6px' }"
			>
				<div role="listbox" aria-label="Local invocations">
					<InvocationListRow
						v-for="invocation in filteredInvocations"
						:key="invocation.id"
						:invocation="invocation"
						:active="invocation.id === selectedId"
						@select="$emit('select', $event)"
						@navigate="selectAdjacent(invocation.id, $event)"
					/>
				</div>
			</q-scroll-area>
		</div>
		<InvocationListEmptyState
			v-else
			:status="status"
			:filtered="invocations.length > 0"
		/>
	</div>
</template>

<script setup lang="ts">
import { computed, nextTick } from "vue";

import type { Filters } from "@/components/ui/Table";
import type {
	LocalConnectionStatus,
	LocalInvocation
} from "@/composables/local";
import InvocationListEmptyState from "./InvocationListEmptyState.vue";
import InvocationListRow from "./InvocationListRow.vue";
import { filterInvocations } from "./invocation-filters";

const props = defineProps<{
	invocations: LocalInvocation[];
	status: LocalConnectionStatus;
	filters: Filters;
	selectedId?: string | undefined;
}>();
const emit = defineEmits<{ select: [id: string] }>();

const filteredInvocations = computed(() =>
	filterInvocations(props.invocations, props.filters)
);

function selectAdjacent(
	id: string,
	direction: "next" | "previous" | "first" | "last"
) {
	const index = filteredInvocations.value.findIndex(
		invocation => invocation.id === id
	);
	const target =
		direction === "first"
			? filteredInvocations.value[0]
			: direction === "last"
				? filteredInvocations.value.at(-1)
				: filteredInvocations.value[
						index + (direction === "next" ? 1 : -1)
					];
	if (!target) return;

	emit("select", target.id);
	void nextTick(() =>
		document.getElementById(`invocation-${target.id}`)?.focus()
	);
}
</script>

<style scoped lang="scss">
.invocation-list {
	border: 1px solid var(--q-secondary-2);
	border-radius: 6px;
	background: var(--q-secondary-3);
}

.invocation-list__header {
	height: 2.125rem;
	padding: 0 0.75rem;
	background: var(--q-secondary-2);
	color: var(--q-text-secondary);
	font-size: 0.75rem;
	font-weight: 500;
}

.invocation-list :deep([role="listbox"] > .invocation-list-row:nth-child(odd)) {
	background: color-mix(in srgb, var(--q-secondary) 6%, transparent);
}
</style>
