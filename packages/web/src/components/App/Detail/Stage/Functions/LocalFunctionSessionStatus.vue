<template>
	<div class="local-function-session-status row items-center q-gutter-md">
		<div class="row items-center q-gutter-xs" role="status">
			<q-icon
				:name="presentation.icon"
				:color="presentation.color"
				size="16px"
			/>
			<span class="text-body2">WebSocket {{ presentation.label }}</span>
		</div>
		<q-separator vertical />
		<div class="row items-center q-gutter-xs" role="status">
			<q-icon
				:name="isStreaming ? 'sym_r_play_circle' : 'sym_r_pause_circle'"
				:color="isStreaming ? 'positive' : 'warning'"
				size="16px"
			/>
			<span class="text-body2">{{
				isStreaming ? "Streaming live" : "Stream paused"
			}}</span>
		</div>
		<q-separator vertical />
		<div class="text-body2">{{ invocations.length }} retained</div>
		<q-separator vertical />
		<div class="text-body2">Last event {{ lastEventLabel }}</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";

import { formatDateTime } from "@/components/ui/format";
import type {
	LocalConnectionStatus,
	LocalInvocation
} from "@/composables/local";

const props = defineProps<{
	status: LocalConnectionStatus;
	isStreaming: boolean;
	invocations: LocalInvocation[];
	lastEventAt?: number | undefined;
}>();

const presentation = computed(() => {
	if (props.status === "connected") {
		return {
			label: "Connected",
			color: "positive",
			icon: "sym_r_check_circle"
		};
	}
	if (props.status === "connecting") {
		return { label: "Connecting", color: "warning", icon: "sym_r_sync" };
	}
	return { label: "Disconnected", color: "negative", icon: "sym_r_error" };
});
const lastEventLabel = computed(() => {
	if (!props.lastEventAt) return "No events received";
	return formatDateTime(new Date(props.lastEventAt).toISOString());
});
</script>
