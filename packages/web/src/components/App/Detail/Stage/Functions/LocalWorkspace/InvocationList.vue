<template>
	<div class="invocation-list column full-height overflow-hidden">
		<div
			v-if="invocations.length"
			class="column full-height overflow-hidden"
		>
			<div
				class="invocation-list__header row no-wrap items-center"
				role="row"
			>
				<div class="col-2" role="columnheader">Time</div>
				<div class="col" role="columnheader">Function</div>
				<div class="col-2 q-pr-md text-right" role="columnheader">Status</div>
				<div class="col-1 text-right" role="columnheader">Duration</div>
			</div>
			<q-separator />
			<q-scroll-area
				class="col"
				:vertical-bar-style="{ width: '6px' }"
				:vertical-thumb-style="{ width: '6px' }"
			>
				<div role="list">
					<InvocationListRow
						v-for="invocation in invocations"
						:key="invocation.id"
						:invocation="invocation"
						:active="invocation.id === selectedId"
						@select="$emit('select', $event)"
					/>
				</div>
			</q-scroll-area>
		</div>
		<InvocationListEmptyState v-else :status="status" />
	</div>
</template>

<script setup lang="ts">
import type {
	LocalConnectionStatus,
	LocalInvocation,
} from "@/composables/local";
import InvocationListEmptyState from "./InvocationListEmptyState.vue";
import InvocationListRow from "./InvocationListRow.vue";

const props = defineProps<{
	invocations: LocalInvocation[];
	status: LocalConnectionStatus;
	selectedId?: string | undefined;
}>();
defineEmits<{ select: [id: string] }>();
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

.invocation-list :deep([role="list"] > .invocation-list-row:nth-child(odd)) {
	background: color-mix(in srgb, var(--q-secondary) 6%, transparent);
}
</style>
