<template>
	<div class="row items-center justify-between q-gutter-sm q-mb-sm">
		<div class="text-subtitle1 text-weight-medium">Resource events</div>
		<PillTabs v-if="events.length" v-model="view" :options="views" />
	</div>
	<div v-if="!events.length" class="text-secondary"
		>No resource events available.</div
	>
	<template v-else-if="view === 'action'">
		<section v-for="group in groups" :key="group.action" class="q-mb-md">
			<div
				class="text-caption text-secondary text-weight-medium text-uppercase q-mb-xs"
				>{{ group.action }} · {{ group.events.length }}</div
			>
			<q-list bordered class="event-list">
				<UpdateResourceEvent
					v-for="event in group.events"
					:key="`${event.resourceId}:${event.action}`"
					:event="event"
				/>
			</q-list>
		</section>
	</template>
	<template v-else>
		<div class="text-caption text-secondary q-mb-sm"
			>Ordered by operation time when available. Events without a time
			appear last.</div
		>
		<q-list bordered class="event-list">
			<UpdateResourceEvent
				v-for="event in chronological"
				:key="`${event.resourceId}:${event.action}`"
				:event="event"
			/>
		</q-list>
	</template>
</template>

<script setup lang="ts">
import type { StateResourceEvent } from "@sst-console/sdk";
import { computed, ref } from "vue";
import { PillTabs } from "@/components/ui/PillTabs";
import UpdateResourceEvent from "./UpdateResourceEvent.vue";

const props = defineProps<{ events: StateResourceEvent[] }>();
const view = ref<"action" | "time">("action");
const views: { label: string; value: "action" | "time" }[] = [
	{ label: "By action", value: "action" },
	{ label: "By time", value: "time" }
];
const actions = ["created", "updated", "deleted"] as const;
const groups = computed(() =>
	actions
		.map(action => ({
			action,
			events: props.events.filter(event => event.action === action)
		}))
		.filter(group => group.events.length)
);
const chronological = computed(() =>
	[...props.events].sort((a, b) => eventTime(a) - eventTime(b))
);

function eventTime(event: StateResourceEvent) {
	const time = Date.parse(
		event.operation?.completedAt ?? event.operation?.startedAt ?? ""
	);
	return Number.isFinite(time) ? time : Infinity;
}
</script>

<style scoped>
.event-list {
	border-radius: 6px;
}
</style>
