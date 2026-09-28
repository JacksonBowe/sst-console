<template>
	<DashboardPage>
		<DashboardPageBreadcrumbs :segments="breadcrumbs" class="q-mb-md" />
		<DashboardPageHeader>
			<div class="stage-detail-header">
				<q-icon name="sym_r_account_tree" size="28px" color="primary" />
				<div class="text-h5 text-weight-bold">{{
					stage?.stageName ?? stageName
				}}</div>
			</div>
		</DashboardPageHeader>

		<DashboardPageContent>
			<StageDetailLoadingState v-if="stageQuery.isPending.value" />
			<StageDetailErrorState
				v-else-if="stageQuery.isError.value"
				:not-found="isNotFound"
				@retry="stageQuery.refetch()"
			/>
			<template v-else-if="stage">
				<StageMetadata :stage="stage" />
				<StageDetailEmptyResources v-if="!stage.resources.length" />
				<ResourceExplorer v-else :resources="stage.resources" />
			</template>
		</DashboardPageContent>
	</DashboardPage>
</template>

<script setup lang="ts">
import { ApiError } from "@sst-console/sdk";
import { computed } from "vue";
import { useRoute } from "vue-router";

import {
	StageDetailEmptyResources,
	StageDetailErrorState,
	StageDetailLoadingState,
	StageMetadata
} from "@/components/App/Detail/Stage";
import {
	DashboardPage,
	DashboardPageBreadcrumbs,
	DashboardPageContent,
	DashboardPageHeader
} from "@/components/ui/Dashboard";
import { ResourceExplorer } from "@/components/ResourceExplorer";
import { useStage } from "@/composables/apps";

const route = useRoute();
const appName = computed(() => String(route.params.appName ?? ""));
const stageName = computed(() => String(route.params.stageName ?? ""));
const stageQuery = useStage(appName, stageName);
const stage = computed(() => stageQuery.data.value);

const breadcrumbs = computed(() => [
	{ label: "Apps", to: { name: "apps" } },
	{
		label: appName.value,
		to: { name: "app-detail", params: { appName: appName.value } }
	},
	{ label: stage.value?.stageName ?? stageName.value }
]);

const isNotFound = computed(() => {
	const error = stageQuery.error.value;
	return error instanceof ApiError && error.code === "stage_not_found";
});
</script>

<style scoped lang="scss">
.stage-detail-header {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}
</style>
