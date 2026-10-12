<template>
	<div class="row justify-end q-gutter-xs no-wrap">
		<q-btn
			v-for="action in actions"
			:key="action.status"
			flat
			dense
			round
			color="primary"
			:icon="action.icon"
			:aria-label="action.label"
			@click="$emit('status', action.status)"
		>
			<q-tooltip>{{ action.label }}</q-tooltip>
		</q-btn>
	</div>
</template>

<script setup lang="ts">
import type { IssueStatus } from "@sst-console/sdk";
import { computed } from "vue";

const props = defineProps<{ status: IssueStatus }>();

defineEmits<{ status: [status: IssueStatus] }>();

const actions = computed(() =>
	availableStatuses(props.status).map(status => ({
		status,
		...statusAction(status)
	}))
);

function availableStatuses(status: IssueStatus): IssueStatus[] {
	return status === "open"
		? ["resolved", "suppressed"]
		: status === "resolved"
			? ["open", "suppressed"]
			: ["open"];
}

function statusAction(status: IssueStatus) {
	return status === "open"
		? { label: "Reopen issue", icon: "sym_r_replay" }
		: status === "resolved"
			? { label: "Resolve issue", icon: "sym_r_check_circle" }
			: { label: "Suppress issue", icon: "sym_r_notifications_off" };
}
</script>
