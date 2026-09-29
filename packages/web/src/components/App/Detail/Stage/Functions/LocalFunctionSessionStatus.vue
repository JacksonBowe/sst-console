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
import { localSessionStatusPresentation } from "./local-session-status";

const props = defineProps<{
	status: LocalConnectionStatus;
	invocations: LocalInvocation[];
	lastEventAt?: number | undefined;
}>();

const presentation = computed(() =>
	localSessionStatusPresentation(props.status)
);
const lastEventLabel = computed(() => {
	if (!props.lastEventAt) return "No events received";
	return formatDateTime(new Date(props.lastEventAt).toISOString());
});
</script>
