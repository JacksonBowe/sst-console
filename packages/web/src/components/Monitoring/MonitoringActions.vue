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
			><q-list dense style="min-width: 13rem">
				<DialogTrigger>
					<template #trigger="{ open }">
						<q-item clickable v-close-popup @click="open">
							<q-item-section>Disable monitoring</q-item-section>
						</q-item>
					</template>
					<DialogConfirm
						title="Disable issue monitoring"
						message="This disables issue monitoring on every monitored stage. Existing log subscriptions are removed asynchronously."
						validation-string="DISABLE"
						variant="negative"
						confirm-label="Disable monitoring"
						:perform="
							() =>
								disableAllIssueMonitoringMutation.mutateAsync()
						"
					/>
				</DialogTrigger>
				<DialogTrigger>
					<template #trigger="{ open }">
						<q-item
							clickable
							v-close-popup
							class="text-negative"
							@click="open"
						>
							<q-item-section>Delete all issues</q-item-section>
						</q-item>
					</template>
					<DialogConfirm
						title="Delete all issues"
						message="This permanently deletes every persisted issue."
						validation-string="DELETE"
						variant="negative"
						confirm-label="Delete all"
						:perform="() => purgeIssuesMutation.mutateAsync()"
					/>
				</DialogTrigger> </q-list
		></q-menu>
	</q-btn>
</template>

<script setup lang="ts">
import {
	AlertRuleTrigger,
	NotificationDestinationTrigger
} from "@/components/AlertRules";
import { DialogConfirm, DialogTrigger } from "@/components/ui/Dialog";
import {
	useDisableAllIssueMonitoring,
	usePurgeIssues
} from "@/composables/issues";

defineProps<{ tab: "issues" | "rules" | "channels" }>();

const purgeIssuesMutation = usePurgeIssues();
const disableAllIssueMonitoringMutation = useDisableAllIssueMonitoring();
</script>
