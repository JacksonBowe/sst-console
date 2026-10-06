<template>
	<DashboardPage>
		<DashboardPageBreadcrumbs :segments="breadcrumbs" class="q-mb-md" />
		<StageDetailHeader
			:title="stage?.stageName ?? stageName"
			icon="sym_r_account_tree"
		>
			<template #actions>
				<q-btn
					flat
					no-caps
					label="Test query"
					:loading="testing"
					@click="testQuery"
				/>
				<q-btn
					unelevated
					no-caps
					color="primary"
					label="Connect"
					:disable="!target"
					:loading="connecting"
					@click="connect"
				/>
				<q-btn
					flat
					no-caps
					label="Retry"
					:disable="!target"
					:loading="connecting"
					@click="connect"
				/>
				<q-btn
					flat
					no-caps
					color="negative"
					label="Disconnect"
					:disable="!target"
					:loading="disconnecting"
					@click="disconnect"
				/>
			</template>
		</StageDetailHeader>

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
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { Notify } from "quasar";

import {
	ResourceExplorer,
	StageDetailEmptyResources,
	StageDetailErrorState,
	StageDetailHeader,
	StageDetailLoadingState,
	StageMetadata
} from "@/components/App/Detail/Stage";
import {
	DashboardPage,
	DashboardPageBreadcrumbs,
	DashboardPageContent
} from "@/components/ui/Dashboard";
import { useStage } from "@/composables/apps";
import {
	getStageResourceCategory,
	resourcesForStageCategory,
	type StageResourceCategory
} from "@/composables/apps/stage-resources";
import { api, handleApiError } from "@/boot/api-client";

const route = useRoute();
const appName = computed(() => String(route.params.appName ?? ""));
const stageName = computed(() => String(route.params.stageName ?? ""));
const stageQuery = useStage(appName, stageName);
const stage = computed(() => stageQuery.data.value);
const connecting = ref(false);
const disconnecting = ref(false);
const testing = ref(false);
const target = computed(() => {
	const app = appName.value;
	const stage = stageName.value;
	return app && stage ? { app, stage } : undefined;
});
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

async function connect() {
	if (!target.value) return;
	connecting.value = true;
	try {
		await api.request({
			method: "POST",
			url: `issues/${encodeURIComponent(target.value.app)}/${encodeURIComponent(target.value.stage)}/connect`
		});
		Notify.create({
			message: "Issue monitoring enabled; reconciliation queued",
			color: "positive"
		});
	} catch (error) {
		handleApiError(error);
	} finally {
		connecting.value = false;
	}
}

async function disconnect() {
	if (!target.value) return;
	disconnecting.value = true;
	try {
		await api.request({
			method: "POST",
			url: `issues/${encodeURIComponent(target.value.app)}/${encodeURIComponent(target.value.stage)}/disconnect`
		});
		Notify.create({
			message: "Issue monitoring disabled; filter removal queued",
			color: "positive"
		});
	} catch (error) {
		handleApiError(error);
	} finally {
		disconnecting.value = false;
	}
}

async function testQuery() {
	testing.value = true;
	try {
		await api.request({ method: "POST", url: "issues/test-query" });
		Notify.create({
			message: "Issue test route responded",
			color: "positive"
		});
	} catch (error) {
		handleApiError(error);
	} finally {
		testing.value = false;
	}
}
</script>
