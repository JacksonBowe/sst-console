<template>
	<DashboardPage>
		<DashboardPageBreadcrumbs :segments="breadcrumbs" class="q-mb-md" />
		<DashboardPageHeader>
			<div class="app-detail-header">
				<q-icon
					name="sym_r_deployed_code"
					size="28px"
					color="primary"
				/>
				<div class="text-h5 text-weight-bold">
					{{ app?.appName ?? appName }}
				</div>
			</div>
			<template #actions>
				<q-btn
					flat
					no-caps
					label="Disable Issue monitoring"
					:disable="!app"
					:loading="updatingMonitoring"
					@click="setMonitoring(false)"
				/>
				<q-btn
					unelevated
					no-caps
					color="primary"
					label="Enable Issue monitoring"
					:disable="!app"
					:loading="updatingMonitoring"
					@click="setMonitoring(true)"
				/>
			</template>
		</DashboardPageHeader>

		<DashboardPageContent>
			<AppDetailLoadingState v-if="appQuery.isPending.value" />
			<AppDetailErrorState
				v-else-if="appQuery.isError.value"
				:not-found="isNotFound"
				@retry="appQuery.refetch()"
			/>
			<template v-else-if="app">
				<AppMetadata :app="app" />
				<AppDetailEmptyStages v-if="!app.stages.length" />
				<AppStagesTable
					v-else
					:app-name="app.appName"
					:stages="app.stages"
				/>
			</template>
		</DashboardPageContent>
	</DashboardPage>
</template>

<script setup lang="ts">
import { ApiError } from "@sst-console/sdk";
import { computed, ref } from "vue";
import { useRoute } from "vue-router";

import {
	AppDetailEmptyStages,
	AppDetailErrorState,
	AppDetailLoadingState,
	AppMetadata,
	AppStagesTable
} from "@/components/App";
import {
	DashboardPage,
	DashboardPageBreadcrumbs,
	DashboardPageContent,
	DashboardPageHeader
} from "@/components/ui/Dashboard";
import { useApp } from "@/composables/apps";
import { api, handleApiError } from "@/boot/api-client";

const route = useRoute();
const appName = computed(() => String(route.params.appName ?? ""));
const appQuery = useApp(appName);
const app = computed(() => appQuery.data.value);
const updatingMonitoring = ref(false);

const breadcrumbs = computed(() => [
	{ label: "Apps", to: { name: "apps" } },
	{ label: app.value?.appName ?? appName.value }
]);

const isNotFound = computed(() => {
	const error = appQuery.error.value;
	return error instanceof ApiError && error.code === "app_not_found";
});

async function setMonitoring(enabled: boolean) {
	if (!app.value) return;
	updatingMonitoring.value = true;
	try {
		await api.setAppIssueMonitoring(app.value.appName, enabled);
		await appQuery.refetch();
	} catch (error) {
		handleApiError(error);
	} finally {
		updatingMonitoring.value = false;
	}
}
</script>

<style scoped lang="scss">
.app-detail-header {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}
</style>
