<template>
	<AlertRuleTrigger v-if="tab === 'rules'">
		<template #trigger="{ open }">
			<q-btn
				unelevated
				no-caps
				color="primary"
				label="Create rule"
				@click="open"
			/>
		</template>
	</AlertRuleTrigger>
	<NotificationDestinationTrigger v-else-if="tab === 'channels'">
		<template #trigger="{ open }">
			<q-btn
				unelevated
				no-caps
				color="primary"
				label="Add destination"
				@click="open"
			/>
		</template>
	</NotificationDestinationTrigger>
	<q-btn
		v-else
		flat
		dense
		round
		icon="sym_r_more_horiz"
		aria-label="Issue maintenance actions"
	>
		<q-menu
			><q-list style="min-width: 13rem">
				<q-item
					clickable
					v-close-popup
					@click="openDisableMonitoringConfirm"
				>
					<q-item-section>Disable monitoring</q-item-section>
				</q-item>
				<q-item
					clickable
					v-close-popup
					@click="testIssueMutation.mutate()"
				>
					<q-item-section>Trigger test error</q-item-section>
				</q-item>
				<q-item
					clickable
					v-close-popup
					class="text-negative"
					@click="openPurgeIssuesConfirm"
				>
					<q-item-section>Delete all issues</q-item-section>
				</q-item>
			</q-list></q-menu
		>
	</q-btn>
</template>

<script setup lang="ts">
import { Dialog } from "quasar";

import {
	AlertRuleTrigger,
	NotificationDestinationTrigger
} from "@/components/AlertRules";
import { DialogConfirm } from "@/components/ui/Dialog";
import {
	useDisableAllIssueMonitoring,
	usePurgeIssues,
	useTestIssue
} from "@/composables/issues";

defineProps<{ tab: "issues" | "rules" | "channels" }>();

const purgeIssuesMutation = usePurgeIssues();
const disableAllIssueMonitoringMutation = useDisableAllIssueMonitoring();
const testIssueMutation = useTestIssue();

function openDisableMonitoringConfirm(): void {
	Dialog.create({
		component: DialogConfirm,
		componentProps: {
			title: "Disable issue monitoring",
			message:
				"This disables issue monitoring on every monitored stage. Existing log subscriptions are removed asynchronously.",
			validationString: "DISABLE",
			variant: "negative",
			confirmLabel: "Disable monitoring",
			perform: () => disableAllIssueMonitoringMutation.mutateAsync()
		}
	});
}

function openPurgeIssuesConfirm(): void {
	Dialog.create({
		component: DialogConfirm,
		componentProps: {
			title: "Delete all issues",
			message: "This permanently deletes every persisted issue.",
			validationString: "DELETE",
			variant: "negative",
			confirmLabel: "Delete all",
			perform: () => purgeIssuesMutation.mutateAsync()
		}
	});
}
</script>
