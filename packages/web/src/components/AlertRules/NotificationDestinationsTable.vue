<template>
	<BaseTable
		:rows="targets"
		:columns="columns"
		:loading="loading"
		row-key="id"
		empty-message="No notification destinations configured"
	>
		<template #body-cell-actions="tableProps">
			<q-td :props="tableProps">
				<div class="row justify-end q-gutter-xs">
					<q-btn
						flat
						dense
						no-caps
						color="primary"
						label="Test"
						:loading="testingTargetId === tableProps.row.id"
						:disable="testingTargetId !== undefined"
						@click="testTarget(tableProps.row)"
					>
						<q-tooltip>Send a test notification</q-tooltip>
					</q-btn>
					<NotificationDestinationTrigger :target="tableProps.row">
						<template #trigger="{ open }">
							<q-btn
								flat
								dense
								round
								icon="sym_r_edit"
								@click="open"
							>
								<q-tooltip>Edit channel</q-tooltip>
							</q-btn>
						</template>
					</NotificationDestinationTrigger>
					<DialogTrigger>
						<template #trigger="{ open }">
							<q-btn
								flat
								dense
								round
								color="negative"
								icon="sym_r_delete"
								@click="open"
							>
								<q-tooltip>Delete channel</q-tooltip>
							</q-btn>
						</template>
						<DialogConfirm
							title="Delete notification destination"
							:message="`Delete ${tableProps.row.name}? Remove it from every alert rule first.`"
							variant="negative"
							confirm-label="Delete"
							:perform="() => removeTarget(tableProps.row)"
						/>
					</DialogTrigger>
				</div>
			</q-td>
		</template>

		<template #body-cell-usage="tableProps">
			<q-td :props="tableProps">{{ ruleUsage(tableProps.row.id) }}</q-td>
		</template>
	</BaseTable>
</template>

<script setup lang="ts">
import type { AlertRule, NotificationDestination } from "@sst-console/sdk";
import { ref } from "vue";

import { BaseTable, type ExtendedQTableColumn } from "@/components/ui/Table";
import { DialogConfirm, DialogTrigger } from "@/components/ui/Dialog";
import {
	useRemoveNotificationDestination,
	useTestNotificationDestination
} from "@/composables/notification-destinations";

import NotificationDestinationTrigger from "./NotificationDestinationTrigger.vue";

const props = defineProps<{
	targets: NotificationDestination[];
	alerts: AlertRule[];
	loading?: boolean;
}>();

const testingTargetId = ref<string>();
const testNotificationDestinationMutation = useTestNotificationDestination();
const removeNotificationDestinationMutation =
	useRemoveNotificationDestination();

const columns: ExtendedQTableColumn[] = [
	{ name: "name", label: "Name", field: "name", align: "left" },
	{ name: "channel", label: "Provider", field: "channel", align: "left" },
	{ name: "usage", label: "Rule usage", field: "id", align: "left" },
	{ name: "actions", label: "", field: "id", align: "right" }
];

function ruleUsage(targetId: string) {
	const count = props.alerts.filter(alert =>
		alert.notificationDestinationIds.includes(targetId)
	).length;
	return `${count} ${count === 1 ? "rule" : "rules"}`;
}

function testTarget(target: NotificationDestination) {
	testingTargetId.value = target.id;
	testNotificationDestinationMutation.mutate(target, {
		onSettled: () => {
			testingTargetId.value = undefined;
		}
	});
}
async function removeTarget(target: NotificationDestination) {
	await removeNotificationDestinationMutation.mutateAsync(target.id);
}
</script>
