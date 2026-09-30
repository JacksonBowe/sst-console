<template>
	<section
		class="bordered rounded-borders"
		aria-labelledby="invocation-logs-title"
	>
		<div class="q-px-md q-py-sm">
			<h3 id="invocation-logs-title" class="text-subtitle2 q-my-none">
				Logs ({{ logs.length }})
			</h3>
		</div>
		<q-separator />
		<div v-if="logs.length" class="invocation-log-panel__scroll">
			<div
				v-for="log in orderedLogs"
				:key="log.id"
				class="invocation-log-panel__line"
			>
				<time class="text-caption text-secondary">{{
					formatTime(log.timestamp)
				}}</time>
				<pre>{{ log.message }}</pre>
			</div>
		</div>
		<div v-else class="q-pa-md text-secondary">No log lines yet.</div>
	</section>
</template>

<script setup lang="ts">
import { computed } from "vue";

import type { LocalLogLine } from "@/composables/local";

const props = defineProps<{ logs: LocalLogLine[] }>();
const orderedLogs = computed(() =>
	[...props.logs].sort((left, right) => left.timestamp - right.timestamp)
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
.invocation-log-panel__scroll {
	max-height: 20rem;
	overflow: auto;
}

.invocation-log-panel__line {
	display: grid;
	grid-template-columns: 5.5rem minmax(0, 1fr);
	gap: 0.75rem;
	padding: 0.5rem 0.75rem;
}

.invocation-log-panel__line + .invocation-log-panel__line {
	border-top: 1px solid var(--q-secondary-2);
}

pre {
	margin: 0;
	font-family: monospace;
	font-size: 0.78rem;
	line-height: 1.5;
	white-space: pre-wrap;
	word-break: break-word;
}
</style>
