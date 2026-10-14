<template>
	<BaseTable
		:rows="targets"
		:columns="columns"
		:loading="loading"
		row-key="id"
		empty-message="No alert targets configured"
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
						@click="$emit('test', tableProps.row)"
					>
						<q-tooltip>Send a test alert</q-tooltip>
					</q-btn>
					<AlertTargetTrigger :target="tableProps.row">
						<template #trigger="{ open }">
							<q-btn
								flat
								dense
								round
								icon="sym_r_edit"
								@click="open"
							>
								<q-tooltip>Edit target</q-tooltip>
							</q-btn>
						</template>
					</AlertTargetTrigger>
					<q-btn
						flat
						dense
						round
						color="negative"
						icon="sym_r_delete"
						@click="$emit('remove', tableProps.row)"
					>
						<q-tooltip>Delete target</q-tooltip>
					</q-btn>
				</div>
			</q-td>
		</template>
	</BaseTable>
</template>

<script setup lang="ts">
import type { AlertTarget } from "@sst-console/sdk";

import { BaseTable, type ExtendedQTableColumn } from "@/components/ui/Table";

import AlertTargetTrigger from "./AlertTargetTrigger.vue";

defineProps<{
	targets: AlertTarget[];
	loading?: boolean;
	testingTargetId?: string | undefined;
}>();

defineEmits<{
	test: [target: AlertTarget];
	remove: [target: AlertTarget];
}>();

const columns: ExtendedQTableColumn[] = [
	{ name: "name", label: "Name", field: "name", align: "left" },
	{ name: "channel", label: "Channel", field: "channel", align: "left" },
	{ name: "actions", label: "", field: "id", align: "right" }
];
</script>
