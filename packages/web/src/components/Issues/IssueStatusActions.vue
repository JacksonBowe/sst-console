<template>
	<div class="row justify-end q-gutter-xs no-wrap">
		<q-btn
			v-if="primaryAction"
			flat
			dense
			round
			color="primary"
			:icon="primaryAction.icon"
			:aria-label="primaryAction.label"
			@click="$emit('status', primaryAction.status)"
		>
			<q-tooltip>{{ primaryAction.label }}</q-tooltip>
		</q-btn>
		<q-btn
			v-if="secondaryActions.length"
			flat
			dense
			round
			icon="sym_r_more_horiz"
			aria-label="More issue actions"
		>
			<q-menu
				><q-list dense
					><q-item
						v-for="action in secondaryActions"
						:key="action.status"
						v-close-popup
						clickable
						@click="$emit('status', action.status)"
						><q-item-section>{{
							action.label
						}}</q-item-section></q-item
					></q-list
				></q-menu
			>
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
const primaryAction = computed(
	() =>
		actions.value.find(action => action.status === "resolved") ??
		actions.value[0]
);
const secondaryActions = computed(() =>
	actions.value.filter(
		action => action.status !== primaryAction.value?.status
	)
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
