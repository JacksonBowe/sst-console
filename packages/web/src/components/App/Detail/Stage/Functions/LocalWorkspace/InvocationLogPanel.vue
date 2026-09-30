<template>
	<q-card
		flat
		bordered
		class="column no-wrap full-height overflow-hidden"
		aria-labelledby="invocation-logs-title"
	>
		<q-card-section
			class="row items-center justify-between q-px-md q-py-sm bg-secondary-2"
		>
			<h3 id="invocation-logs-title" class="text-subtitle2 q-my-none">
				Logs
			</h3>
			<q-badge color="primary" class="q-px-sm q-py-xs">
				{{ logs.length }}
			</q-badge>
		</q-card-section>
		<q-separator />
		<q-scroll-area
			v-if="logs.length"
			class="col invocation-log-panel__scroll"
			aria-label="Invocation logs"
		>
			<div
				v-for="log in orderedLogs"
				:key="log.id"
				class="invocation-log-panel__line"
			>
				<time class="text-muted">{{ formatTime(log.timestamp) }}</time>
				<pre>{{ log.message }}</pre>
			</div>
		</q-scroll-area>
		<q-card-section v-else class="col q-pa-md text-secondary">
			No log lines yet.
		</q-card-section>
	</q-card>
</template>

<script setup lang="ts">
import { computed } from "vue";

import type { LocalLogLine } from "@/composables/local";

const props = defineProps<{ logs: LocalLogLine[] }>();
const orderedLogs = computed(() =>
	[...props.logs].sort((left, right) => left.timestamp - right.timestamp),
);

function formatTime(timestamp: number) {
	return new Date(timestamp).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
}
</script>

<style scoped lang="scss">
.invocation-log-panel__scroll {
	min-height: 0;
}

.invocation-log-panel__line {
	display: grid;
	grid-template-columns: 5.5rem minmax(0, 1fr);
	gap: 0.75rem;
	padding: 0.5rem 0.75rem;
	font-family: monospace;
	font-size: 0.78rem;
	line-height: 1.5;
}

.invocation-log-panel__line:nth-child(even) {
	background: var(--q-secondary-2);
}

.invocation-log-panel__line + .invocation-log-panel__line {
	border-top: 1px solid var(--q-secondary-2);
}

pre {
	margin: 0;
	font-family: inherit;
	font-size: inherit;
	line-height: inherit;
	white-space: pre-wrap;
	word-break: break-word;
}
</style>
