<template>
	<div class="row">
		<div class="row no-wrap items-center">
			<q-icon
				:name="statusIcon"
				:color="statusColor"
				size="34px"
				aria-hidden="true"
				class="q-mr-sm"
			/>
			<div>
				<h2 class="text-h6 q-my-none">{{ sourceName }}</h2>
				<div class="text-body2 text-secondary">
					Invocation at {{ formatDateTime(invocation.start) }}
				</div>
			</div>
		</div>
		<q-space />
		<div class="row items-center no-wrap">
			<span
				v-if="invocation.duration !== undefined"
				class="text-weight-medium"
			>
				{{ invocation.duration }}ms
			</span>
			<q-badge
				:color="statusColor"
				rounded
				class="q-ml-sm q-px-sm q-py-xs"
			>
				{{ statusLabel }}
			</q-badge>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";

import type { LocalInvocation } from "@/composables/local";

const props = defineProps<{ invocation: LocalInvocation }>();

const sourceName = computed(
	() => props.invocation.source?.split("::").at(-1) ?? "Unknown source"
);
const statusLabel = computed(
	() =>
		({ pending: "Running", success: "Success", error: "Error" })[
			props.invocation.status
		]
);
const statusColor = computed(
	() =>
		({ pending: "warning", success: "positive", error: "negative" })[
			props.invocation.status
		]
);
const statusIcon = computed(
	() =>
		({
			pending: "sym_r_progress_activity",
			success: "sym_r_check_circle",
			error: "sym_r_error"
		})[props.invocation.status]
);

function formatDateTime(timestamp: number) {
	return new Date(timestamp).toLocaleString([], {
		year: "numeric",
		month: "numeric",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit"
	});
}
</script>
