<template>
	<q-card
		flat
		bordered
		class="invocation-list column no-wrap full-height overflow-hidden"
	>
		<div
			v-if="filteredInvocations.length"
			class="column full-height overflow-hidden"
		>
			<q-card-section class="q-pa-sm bg-secondary-2">
				<div class="invocation-list__header items-center" role="row">
					<div role="columnheader">Time</div>
					<div role="columnheader">Function</div>
					<div class="q-pr-md text-right" role="columnheader">
						Status
					</div>
					<div class="text-right" role="columnheader"> Duration </div>
				</div>
			</q-card-section>
			<q-separator />
			<q-scroll-area
				class="col"
				content-style="width: 100%"
				content-active-style="width: 100%"
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
			:is-streaming="isStreaming"
			:filtered="invocations.length > 0"
		/>
	</q-card>
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
	isStreaming: boolean;
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
	--invocation-columns: 5rem minmax(0, 1fr) 5rem 4rem;
}

.invocation-list__header {
	display: grid;
	grid-template-columns: var(--invocation-columns);
	padding: 0 0.25rem;
	color: var(--q-text-secondary);
	font-size: 0.75rem;
	font-weight: 500;
}

.invocation-list
	:deep([role="listbox"] > .invocation-list-row:nth-child(even)) {
	background-color: var(--q-secondary-2);
}
</style>
