<template>
	<BaseTable
		:rows="alerts"
		:columns="columns"
		:loading="loading"
		row-key="id"
		empty-message="No alert rules configured"
	>
		<template #body-cell-source="tableProps">
			<q-td :props="tableProps">
				{{ sourceLabel(tableProps.row) }}
			</q-td>
		</template>

		<template #body-cell-targets="tableProps">
			<q-td :props="tableProps">
				{{ targetLabels(tableProps.row.notificationDestinationIds) }}
			</q-td>
		</template>

		<template #body-cell-actions="tableProps">
			<q-td :props="tableProps">
				<div class="row justify-end q-gutter-xs">
					<AlertRuleTrigger :alert="tableProps.row">
						<template #trigger="{ open }">
							<q-btn
								flat
								dense
								round
								icon="sym_r_edit"
								@click="open"
							>
								<q-tooltip>Edit rule</q-tooltip>
							</q-btn>
						</template>
					</AlertRuleTrigger>
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
								<q-tooltip>Delete rule</q-tooltip>
							</q-btn>
						</template>
						<DialogConfirm
							title="Delete alert rule"
							:message="`Delete rule for ${sourceLabel(tableProps.row)}?`"
							variant="negative"
							confirm-label="Delete"
							:perform="() => removeRule(tableProps.row)"
						/>
					</DialogTrigger>
				</div>
			</q-td>
		</template>
	</BaseTable>
</template>

<script setup lang="ts">
import type { AlertRule, NotificationDestination } from "@sst-console/sdk";

import { BaseTable, type ExtendedQTableColumn } from "@/components/ui/Table";
import { DialogConfirm, DialogTrigger } from "@/components/ui/Dialog";
import { useRemoveAlertRule } from "@/composables/alert-rules";

import AlertRuleTrigger from "./AlertRuleTrigger.vue";

const props = defineProps<{
	alerts: AlertRule[];
	targets: NotificationDestination[];
	loading?: boolean;
}>();

const removeAlertRuleMutation = useRemoveAlertRule();

const columns: ExtendedQTableColumn[] = [
	{ name: "type", label: "Trigger", field: "type", align: "left" },
	{ name: "source", label: "Scope", field: "appName", align: "left" },
	{
		name: "targets",
		label: "Notification destinations",
		field: "notificationDestinationIds",
		align: "left"
	},
	{ name: "actions", label: "", field: "id", align: "right" }
];

function sourceLabel(alert: AlertRule) {
	if (!alert.appName) return "All apps · All stages";
	return `${alert.appName} · ${alert.stageName ?? "All stages"}`;
}

function targetLabels(notificationDestinationIds: string[]) {
	const names = new Map(
		props.targets.map(target => [target.id, target.name])
	);
	return notificationDestinationIds
		.map(id => names.get(id) ?? "Removed target")
		.join(", ");
}

async function removeRule(alert: AlertRule) {
	await removeAlertRuleMutation.mutateAsync(alert.id);
}
</script>
