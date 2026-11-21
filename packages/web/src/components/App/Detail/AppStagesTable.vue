<template>
	<div class="text-subtitle1 text-weight-medium q-mb-sm">Stages</div>
	<BaseTable
		:rows="stages"
		:columns="columns"
		:rows-per-page-options="[0]"
		hide-pagination
		:grid="$q.screen.lt.md"
		row-key="stageName"
		:row-class="() => 'cursor-pointer'"
		@row-click="openStage"
	>
		<template #item="tableProps">
			<AppStageCard
				:stage="tableProps.row"
				:app-name="appName"
				:updating-stage-name="updatingStageName"
				@click="openStage($event, tableProps.row)"
				@monitoring="$emit('monitoring', tableProps.row, $event)"
			/>
		</template>

		<template #body-cell-stageName="props">
			<q-td :props="props">
				<router-link
					class="app-stages-table__link"
					:to="stageRoute(props.row.stageName)"
				>
					{{ props.row.stageName }}
				</router-link>
			</q-td>
		</template>

		<template #body-cell-accountId="props">
			<q-td :props="props">
				<router-link
					class="app-stages-table__link text-mono"
					:to="{
						name: 'account-detail',
						params: { accountId: props.row.accountId }
					}"
				>
					{{ props.row.accountId }}
				</router-link>
			</q-td>
		</template>

		<template #body-cell-state="props">
			<q-td :props="props">
				<span v-if="props.row.state" :title="props.row.state.sourceKey">
					{{ formatTimestamp(props.row.state.observedAt) }}
				</span>
				<span v-else class="text-secondary">No state</span>
			</q-td>
		</template>

		<template #body-cell-updatedAt="props">
			<q-td :props="props" :title="props.row.updatedAt">
				{{ formatTimestamp(props.row.updatedAt) }}
			</q-td>
		</template>

		<template #body-cell-issueMonitoringEnabled="props">
			<q-td :props="props">
				<q-badge
					:color="
						props.row.issueMonitoringEnabled ? 'positive' : 'grey'
					"
					:label="
						props.row.issueMonitoringEnabled
							? 'Enabled'
							: 'Disabled'
					"
				/>
			</q-td>
		</template>

		<template #body-cell-actions="props">
			<q-td :props="props">
				<q-btn
					flat
					dense
					no-caps
					:color="
						props.row.issueMonitoringEnabled
							? 'negative'
							: 'primary'
					"
					:label="
						props.row.issueMonitoringEnabled
							? 'Disable monitoring'
							: 'Enable monitoring'
					"
					:loading="updatingStageName === props.row.stageName"
					:disable="Boolean(updatingStageName)"
					@click.stop="
						$emit(
							'monitoring',
							props.row,
							!props.row.issueMonitoringEnabled
						)
					"
				/>
			</q-td>
		</template>
	</BaseTable>
</template>

<script setup lang="ts">
import type { AppStage } from "@sst-console/sdk";
import { useRouter } from "vue-router";

import { formatDateTime } from "@/components/ui/format";
import { BaseTable, type ExtendedQTableColumn } from "@/components/ui/Table";

import AppStageCard from "./AppStageCard.vue";

const props = defineProps<{
	appName: string;
	stages: AppStage[];
	updatingStageName?: string | undefined;
}>();

defineEmits<{ monitoring: [stage: AppStage, enabled: boolean] }>();

const router = useRouter();
const columns: ExtendedQTableColumn[] = [
	{
		name: "stageName",
		label: "Stage",
		field: "stageName",
		align: "left",
		sortable: true
	},
	{
		name: "accountId",
		label: "Account",
		field: "accountId",
		align: "left",
		sortable: true
	},
	{
		name: "region",
		label: "Region",
		field: "region",
		align: "left",
		sortable: true
	},
	{
		name: "resourceCount",
		label: "Resources",
		field: "resourceCount",
		align: "right",
		sortable: true
	},
	{
		name: "state",
		label: "State observed",
		field: row => row.state?.observedAt ?? "",
		align: "left",
		sortable: true
	},
	{
		name: "issueMonitoringEnabled",
		label: "Issue monitoring",
		field: "issueMonitoringEnabled",
		align: "left",
		sortable: true
	},
	{
		name: "updatedAt",
		label: "Updated",
		field: "updatedAt",
		align: "left",
		sortable: true
	},
	{
		name: "actions",
		label: "Actions",
		field: () => "",
		align: "right"
	}
];

function formatTimestamp(value: string | null | undefined) {
	if (!value || Number.isNaN(new Date(value).getTime())) return "Unavailable";
	return formatDateTime(value);
}

function stageRoute(stageName: string) {
	return {
		name: "stage-detail",
		params: { appName: props.appName, stageName }
	};
}

function openStage(event: Event, stage: AppStage) {
	if (
		event.target instanceof Element &&
		event.target.closest("a, button, input, [role='button']")
	)
		return;
	void router.push(stageRoute(stage.stageName));
}
</script>

<style scoped lang="scss">
.app-stages-table__link {
	color: var(--q-primary);
	text-decoration: none;
}

.app-stages-table__link:hover {
	text-decoration: underline;
}
</style>
