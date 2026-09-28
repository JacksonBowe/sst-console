<template>
	<div v-if="invocation" class="local-invocation-detail q-pa-md">
		<div class="row items-start justify-between q-gutter-md">
			<div>
				<div class="text-overline text-secondary">Local invocation</div>
				<div class="text-h6">{{ sourceName }}</div>
			</div>
			<q-badge :color="statusColor" rounded class="q-px-sm q-py-xs">
				{{ statusLabel }}
			</q-badge>
		</div>

		<q-list dense class="q-mt-md rounded-borders bordered">
			<q-item>
				<q-item-section
					><q-item-label caption
						>Started</q-item-label
					></q-item-section
				>
				<q-item-section side>{{
					formatTime(invocation.start)
				}}</q-item-section>
			</q-item>
			<q-item v-if="invocation.duration !== undefined">
				<q-item-section
					><q-item-label caption
						>Duration</q-item-label
					></q-item-section
				>
				<q-item-section side
					>{{ invocation.duration }}ms</q-item-section
				>
			</q-item>
		</q-list>

		<q-expansion-item
			default-opened
			label="Request"
			header-class="text-weight-medium"
			class="q-mt-md bordered rounded-borders"
		>
			<JsonPreview :value="invocation.input ?? null" />
		</q-expansion-item>
		<q-expansion-item
			default-opened
			:label="`Logs (${invocation.logs.length})`"
			header-class="text-weight-medium"
			class="q-mt-md bordered rounded-borders"
		>
			<div v-if="!invocation.logs.length" class="q-pa-md text-secondary"
				>No log lines yet.</div
			>
			<q-list
				v-else
				dense
				separator
				class="local-invocation-detail__logs"
			>
				<q-item v-for="log in invocation.logs" :key="log.id">
					<q-item-section
						side
						top
						class="text-caption text-secondary"
						>{{ formatTime(log.timestamp) }}</q-item-section
					>
					<q-item-section>
						<pre>{{ log.message }}</pre>
					</q-item-section>
				</q-item>
			</q-list>
		</q-expansion-item>
		<q-expansion-item
			v-if="invocation.status === 'success'"
			default-opened
			label="Response"
			header-class="text-weight-medium"
			class="q-mt-md bordered rounded-borders"
		>
			<JsonPreview :value="invocation.output ?? null" />
		</q-expansion-item>
		<q-expansion-item
			v-if="invocation.errors.length"
			default-opened
			label="Error"
			header-class="text-negative text-weight-medium"
			class="q-mt-md bordered rounded-borders"
		>
			<div
				v-for="(error, index) in invocation.errors"
				:key="index"
				class="q-pa-md"
			>
				<div class="text-weight-medium">{{
					error.error ?? "Error"
				}}</div>
				<div>{{ error.message }}</div>
				<pre
					v-if="error.stack.length"
					class="local-invocation-detail__stack q-mt-sm"
					>{{ error.stack.join("\n") }}</pre>
			</div>
		</q-expansion-item>
	</div>
	<div
		v-else
		class="column flex-center full-height q-pa-xl text-center text-secondary"
	>
		<q-icon name="sym_r_terminal" size="44px" class="q-mb-sm" />
		<div class="text-subtitle1">Select an invocation</div>
		<div class="text-body2"
			>Local requests, logs, responses, and errors appear here.</div
		>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";

import { JsonPreview } from "@/components/ui/Preview";
import type { LocalInvocation } from "@/composables/local";

const props = defineProps<{ invocation?: LocalInvocation | undefined }>();

const sourceName = computed(
	() => props.invocation?.source?.split("::").at(-1) ?? "Unknown function"
);
const statusColor = computed(
	() =>
		({ pending: "warning", success: "positive", error: "negative" })[
			props.invocation?.status ?? "pending"
		]!
);
const statusLabel = computed(
	() =>
		({ pending: "Running", success: "Complete", error: "Failed" })[
			props.invocation?.status ?? "pending"
		]!
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
.local-invocation-detail {
	margin: auto;
	max-width: 60rem;
}

.local-invocation-detail__logs pre,
.local-invocation-detail__stack {
	margin: 0;
	font-family: monospace;
	font-size: 0.78rem;
	line-height: 1.5;
	white-space: pre-wrap;
	word-break: break-word;
}

.local-invocation-detail__stack {
	padding: 0.75rem;
	background: color-mix(in srgb, var(--q-negative) 10%, transparent);
	border-radius: 4px;
}
</style>
