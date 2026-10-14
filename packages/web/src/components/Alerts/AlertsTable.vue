<template>
	<BaseTable
		:rows="alerts"
		:columns="columns"
		:loading="loading"
		row-key="id"
		empty-message="No alerts configured"
	>
		<template #body-cell-source="tableProps">
			<q-td :props="tableProps">
				{{ sourceLabel(tableProps.row) }}
			</q-td>
		</template>

		<template #body-cell-targets="tableProps">
			<q-td :props="tableProps">
				{{ targetLabels(tableProps.row.targetIds) }}
			</q-td>
		</template>

		<template #body-cell-actions="tableProps">
			<q-td :props="tableProps">
				<div class="row justify-end q-gutter-xs">
					<AlertTrigger :alert="tableProps.row">
						<template #trigger="{ open }">
							<q-btn flat dense round icon="sym_r_edit" @click="open">
								<q-tooltip>Edit alert</q-tooltip>
							</q-btn>
						</template>
					</AlertTrigger>
					<q-btn
						flat
						dense
						round
						color="negative"
						icon="sym_r_delete"
						@click="$emit('remove', tableProps.row)"
					>
						<q-tooltip>Delete alert</q-tooltip>
					</q-btn>
				</div>
			</q-td>
		</template>
	</BaseTable>
</template>

<script setup lang="ts">
import type { Alert, AlertTarget } from "@sst-console/sdk";

import { BaseTable, type ExtendedQTableColumn } from "@/components/ui/Table";

import AlertTrigger from "./AlertTrigger.vue";

const props = defineProps<{
	alerts: Alert[];
	targets: AlertTarget[];
	loading?: boolean;
}>();

defineEmits<{ remove: [alert: Alert] }>();

const columns: ExtendedQTableColumn[] = [
	{ name: "type", label: "Type", field: "type", align: "left" },
	{ name: "source", label: "Source", field: "appName", align: "left" },
	{ name: "targets", label: "Targets", field: "targetIds", align: "left" },
	{ name: "actions", label: "", field: "id", align: "right" }
];

function sourceLabel(alert: Alert) {
	if (!alert.appName) return "All apps · All stages";
	return `${alert.appName} · ${alert.stageName ?? "All stages"}`;
}

function targetLabels(targetIds: string[]) {
	const names = new Map(
		props.targets.map(target => [target.id, target.name])
	);
	return targetIds.map(id => names.get(id) ?? "Removed target").join(", ");
}
</script>
