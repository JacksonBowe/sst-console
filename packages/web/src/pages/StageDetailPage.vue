<template>
	<DashboardPage>
		<DashboardPageBreadcrumbs :segments="breadcrumbs" class="q-mb-md" />
		<DashboardPageHeader class="stage-detail-page__header">
			<div class="stage-detail-header">
				<q-icon name="sym_r_account_tree" size="28px" color="primary" />
				<div class="text-h5 text-weight-bold">
					{{ stage?.stageName ?? stageName }}
				</div>
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
				<StageDetailEmptyResources v-if="!visibleResources.length" />
				<ResourceExplorer v-else :resources="visibleResources" />
			</template>
		</DashboardPageContent>
	</DashboardPage>
</template>

<script setup lang="ts">
import { ApiError } from "@sst-console/sdk";
import { computed } from "vue";
import { useRoute } from "vue-router";

import {
	ResourceExplorer,
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
import { useStage } from "@/composables/apps";
import {
	getStageResourceCategory,
	resourcesForStageCategory,
	type StageResourceCategory
} from "@/composables/apps/stage-resources";

const route = useRoute();
const appName = computed(() => String(route.params.appName ?? ""));
const stageName = computed(() => String(route.params.stageName ?? ""));
const stageQuery = useStage(appName, stageName);
const stage = computed(() => stageQuery.data.value);
const resourceCategory = computed(() => {
	if (route.name !== "stage-resource") return undefined;
	const category = String(route.params.category ?? "");
	return getStageResourceCategory(category)?.key;
});
const visibleResources = computed(() => {
	if (!stage.value) return [];
	if (!resourceCategory.value) return stage.value.resources;
	return resourcesForStageCategory(
		stage.value.resources,
		resourceCategory.value as StageResourceCategory
	);
});
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
