<template>
	<BaseTable
		:rows="stages"
		:columns="columns"
		:rows-per-page-options="[12, 24, 48]"
		:row-class="() => 'cursor-pointer'"
		@row-click="openStage"
	>
		<template #top>
			<div class="q-pa-md text-subtitle1 text-weight-medium">Stages</div>
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

		<template #body-cell-latestSnapshot="props">
			<q-td :props="props">
				<span
					v-if="props.row.latestSnapshot"
					:title="props.row.latestSnapshot.snapshotId"
				>
					{{ formatTimestamp(props.row.latestSnapshot.createdAt) }}
				</span>
				<span v-else class="text-secondary">No snapshot</span>
			</q-td>
		</template>

		<template #body-cell-updatedAt="props">
			<q-td :props="props" :title="props.row.updatedAt">
				{{ formatTimestamp(props.row.updatedAt) }}
			</q-td>
		</template>
	</BaseTable>
</template>

<script setup lang="ts">
import type { AppStage } from "@sst-console/sdk";
import { useRouter } from "vue-router";

import { formatDateTime } from "@/components/ui/format";
import { BaseTable, type ExtendedQTableColumn } from "@/components/ui/Table";

const props = defineProps<{
	appName: string;
	stages: AppStage[];
}>();

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
		name: "latestSnapshot",
		label: "Latest snapshot",
		field: row => row.latestSnapshot?.createdAt ?? "",
		align: "left",
		sortable: true
	},
	{
		name: "updatedAt",
		label: "Updated",
		field: "updatedAt",
		align: "left",
		sortable: true
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
