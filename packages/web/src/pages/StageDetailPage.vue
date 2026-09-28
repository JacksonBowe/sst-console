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
			<PillTabs
				v-if="isLocalStage"
				v-model="workspace"
				:options="workspaceTabs"
			/>
		</DashboardPageHeader>

		<DashboardPageContent
			:class="{
				'stage-detail-page__content--local':
					isLocalStage && workspace === 'local',
			}"
		>
			<StageDetailLoadingState v-if="stageQuery.isPending.value" />
			<StageDetailErrorState
				v-else-if="stageQuery.isError.value"
				:not-found="isNotFound"
				@retry="stageQuery.refetch()"
			/>
			<template v-else-if="stage">
				<LocalStageWorkspace
					v-if="isLocalStage && workspace === 'local'"
					:invocations="localSession.invocations.value"
					@clear="localSession.clear"
					class="col"
				/>
				<template v-else>
					<StageMetadata :stage="stage" />
					<StageDetailEmptyResources v-if="!stage.resources.length" />
					<ResourceExplorer v-else :resources="stage.resources" />
				</template>
			</template>
		</DashboardPageContent>
	</DashboardPage>
</template>

<script setup lang="ts">
import { ApiError } from "@sst-console/sdk";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";

import {
	StageDetailEmptyResources,
	StageDetailErrorState,
	StageDetailLoadingState,
	StageMetadata,
} from "@/components/App/Detail/Stage";
import { LocalStageWorkspace } from "@/components/LocalStage";
import { ResourceExplorer } from "@/components/ResourceExplorer";
import {
	DashboardPage,
	DashboardPageBreadcrumbs,
	DashboardPageContent,
	DashboardPageHeader,
} from "@/components/ui/Dashboard";
import { PillTabs } from "@/components/ui/PillTabs";
import { useStage } from "@/composables/apps";
import { useLocalSession } from "@/composables/local";

const route = useRoute();
const appName = computed(() => String(route.params.appName ?? ""));
const stageName = computed(() => String(route.params.stageName ?? ""));
const stageQuery = useStage(appName, stageName);
const stage = computed(() => stageQuery.data.value);
const localSession = useLocalSession();
const workspace = ref<"overview" | "local">("local");
const workspaceTabs = [
	{ value: "overview" as const, label: "Overview" },
	{ value: "local" as const, label: "Local" },
];
const isLocalStage = computed(() => {
	const identity = localSession.identity.value;
	if (!identity || !stage.value) return false;
	return (
		identity.app === stage.value.appName &&
		identity.stage === stage.value.stageName &&
		(!identity.region || identity.region === stage.value.region)
	);
});

watch(isLocalStage, (connected) => {
	if (!connected) workspace.value = "overview";
});

const breadcrumbs = computed(() => [
	{ label: "Apps", to: { name: "apps" } },
	{
		label: appName.value,
		to: { name: "app-detail", params: { appName: appName.value } },
	},
	{ label: stage.value?.stageName ?? stageName.value },
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

.stage-detail-page__header {
	align-items: center;
	justify-content: space-between;
}

.stage-detail-page__content--local {
	height: 74vh;
}
</style>
