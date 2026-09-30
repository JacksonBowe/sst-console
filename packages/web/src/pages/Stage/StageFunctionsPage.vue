<template>
	<DashboardPage>
		<DashboardPageBreadcrumbs :segments="breadcrumbs" class="q-mb-md" />
		<StageDetailHeader
			:stage="stage"
			title="Functions"
			icon="sym_r_functions"
			:subtitle="
				isLocalStage
					? 'Live invocation activity from your local SST dev environment.'
					: undefined
			"
		/>

		<DashboardPageContent
			:class="{ 'stage-function-page__content--local': isLocalStage }"
		>
			<StageDetailLoadingState v-if="stageQuery.isPending.value" />
			<StageDetailErrorState
				v-else-if="stageQuery.isError.value"
				:not-found="isNotFound"
				@retry="stageQuery.refetch()"
			/>
			<template v-else-if="stage">
				<FunctionInvocationWorkspace
					v-if="isLocalStage"
					:invocations="localSession.invocations"
					:status="localSession.status"
					class="col"
					@clear="localSession.clear()"
				/>
				<FunctionNavigator v-else :functions="functionResources" />
			</template>
		</DashboardPageContent>
	</DashboardPage>
</template>

<script setup lang="ts">
import { ApiError } from "@sst-console/sdk";
import { computed } from "vue";
import { useRoute } from "vue-router";

import {
	FunctionInvocationWorkspace,
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
import { localSessionMatchesStage } from "@/composables/local";
import { useLocalSessionStore } from "@/stores/local-session";

const route = useRoute();
const appName = computed(() => String(route.params.appName ?? ""));
const stageName = computed(() => String(route.params.stageName ?? ""));
const stageQuery = useStage(appName, stageName);
const stage = computed(() => stageQuery.data.value);
const localSession = useLocalSessionStore();
const isLocalStage = computed(() =>
	localSessionMatchesStage(localSession.identity, stage.value)
);
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

<style scoped lang="scss">
.stage-function-page__content--local {
	height: 74vh;
}
</style>
