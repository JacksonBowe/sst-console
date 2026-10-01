<template>
	<DashboardPage>
		<DashboardPageBreadcrumbs :segments="breadcrumbs" class="q-mb-md" />
		<StageDetailHeader title="Functions" icon="sym_r_functions" />

		<DashboardPageContent>
			<StageDetailLoadingState v-if="stageQuery.isPending.value" />
			<StageDetailErrorState
				v-else-if="stageQuery.isError.value"
				:not-found="isNotFound"
				@retry="stageQuery.refetch()"
			/>
			<template v-else-if="stage">
				<FunctionNavigator :functions="functionResources" />
			</template>
		</DashboardPageContent>
	</DashboardPage>
</template>

<script setup lang="ts">
import { ApiError } from "@sst-console/sdk";
import { computed } from "vue";
import { useRoute } from "vue-router";

import {
	FunctionNavigator,
	StageDetailErrorState,
	StageDetailHeader,
	StageDetailLoadingState
} from "@/components/App/Detail/Stage";
import {
	DashboardPage,
	DashboardPageBreadcrumbs,
	DashboardPageContent
} from "@/components/ui/Dashboard";
import { useStage } from "@/composables/apps";
import { functionResourcesFor } from "@/composables/apps/stage-resources";

const route = useRoute();
const appName = computed(() => String(route.params.appName ?? ""));
const stageName = computed(() => String(route.params.stageName ?? ""));
const stageQuery = useStage(appName, stageName);
const stage = computed(() => stageQuery.data.value);
const functionResources = computed(() =>
	functionResourcesFor(stage.value?.resources ?? [])
);
const breadcrumbs = computed(() => [
	{ label: "Apps", to: { name: "apps" } },
	{
		label: appName.value,
		to: { name: "app-detail", params: { appName: appName.value } }
	},
	{
		label: stage.value?.stageName ?? stageName.value,
		to: {
			name: "stage-detail",
			params: { appName: appName.value, stageName: stageName.value }
		}
	},
	{ label: "Functions" }
]);
const isNotFound = computed(() => {
	const error = stageQuery.error.value;
	return error instanceof ApiError && error.code === "stage_not_found";
});
</script>
