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
		return {
			icon: "sym_r_terminal",
			title: "Waiting for local invocations",
			detail: "Connected to local SST CLI."
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
		detail: "Reconnecting to local development session."
	};
});
</script>
