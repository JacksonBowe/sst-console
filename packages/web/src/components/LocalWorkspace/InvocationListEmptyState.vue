<template>
	<div
		class="column flex-center full-height q-pa-lg text-center text-secondary"
	>
		<q-icon :name="presentation.icon" size="32px" class="q-mb-sm" />
		<div class="text-body2">{{ presentation.title }}</div>
		<div class="text-caption q-mt-xs">{{ presentation.detail }}</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";

import type { LocalConnectionStatus } from "@/composables/local";

const props = defineProps<{
	status: LocalConnectionStatus;
	isStreaming: boolean;
	filtered?: boolean;
}>();

const presentation = computed(() => {
	if (props.filtered) {
		return {
			icon: "sym_r_search_off",
			title: "No matching invocations",
			detail: "Change or clear filters to show local activity."
		};
	}
	if (props.status === "connected") {
		if (!props.isStreaming) {
			return {
				icon: "sym_r_pause_circle",
				title: "Streaming paused",
				detail: "Resume streaming to show new local invocations."
			};
		}
		return {
			icon: "sym_r_terminal",
			title: "Waiting for local invocations",
			detail: "Invoke a local function to see activity here."
		};
	}
	if (props.status === "connecting") {
		return {
			icon: "sym_r_sync",
			title: "Connecting to local SST CLI",
			detail: "Invocation activity appears after connection."
		};
	}
	return {
		icon: "sym_r_cloud_off",
		title: "Local SST CLI activity unavailable",
		detail: "Start SST dev and allow local network access in your browser. Reconnection is automatic when local access is enabled."
	};
});
</script>
