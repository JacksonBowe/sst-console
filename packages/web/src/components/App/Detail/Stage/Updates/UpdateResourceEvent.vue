<template>
	<q-item dense class="resource-event q-px-sm q-py-sm" :title="event.urn">
		<q-item-section>
			<div class="resource-event__line text-body2 text-mono">
				<span
					class="resource-event__action text-weight-medium"
					:class="actionColor"
					>{{ event.action }}</span
				>
				<span class="text-weight-medium resource-event__name">{{
					name
				}}</span>
				<span class="text-secondary resource-event__type">{{
					event.resourceType
				}}</span>
				<span
					v-if="event.operation?.outcome === 'failed'"
					class="text-negative"
					>Operation: failed</span
				>
			</div>
			<q-tooltip>{{ event.urn }}</q-tooltip>
		</q-item-section>
		<q-item-section v-if="operationDuration" side class="text-mono"
			>({{ operationDuration }})</q-item-section
		>
	</q-item>
</template>

<script setup lang="ts">
import type { StateResourceEvent } from "@sst-console/sdk";
import { computed } from "vue";
import { duration } from "./update-format";

const props = defineProps<{ event: StateResourceEvent }>();
const name = computed(
	() => props.event.urn.split("::").at(-1) || props.event.urn
);
const actionColor = computed(
	() =>
		({
			created: "text-positive",
			updated: "text-warning",
			deleted: "text-negative"
		})[props.event.action]
);
const operationDuration = computed(() => {
	const operation = props.event.operation;
	if (!operation?.startedAt || !operation.completedAt) return undefined;
	const value = duration(operation.startedAt, operation.completedAt);
	return value === "Duration unavailable" ? undefined : value;
});
</script>

<style scoped>
.resource-event + .resource-event {
	border-top: 1px solid var(--q-border);
}
.resource-event__line {
	display: flex;
	align-items: baseline;
	flex-wrap: wrap;
	gap: 0.25rem 0.75rem;
}
.resource-event__action {
	min-width: 4.5rem;
	text-transform: capitalize;
}
.resource-event__name,
.resource-event__type {
	overflow-wrap: anywhere;
}
</style>
