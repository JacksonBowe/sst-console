<template>
	<DashboardPage>
		<DashboardPageBreadcrumbs
			v-if="isContextual"
			:segments="breadcrumbs"
			class="q-mb-md"
		/>
		<DashboardPageHeader
			title="Local Workspace"
			:subtitle="subtitle"
			icon="sym_r_terminal"
		/>

		<DashboardPageContent class="local-workspace-page__content">
			<LocalWorkspace
				v-if="hasMatchingSession"
				:invocations="localSession.invocations"
				:status="localSession.status"
				:is-streaming="localSession.isStreaming"
				class="col"
				@clear="localSession.clear()"
				@toggle-stream="localSession.toggleStreaming()"
			/>
			<q-card v-else flat bordered class="q-pa-xl">
				<div class="column items-center text-center q-gutter-sm">
					<q-icon
						name="sym_r_terminal"
						size="40px"
						color="secondary"
					/>
					<div class="text-h6">No matching local session</div>
					<div class="text-body2 text-secondary">
						Start SST dev for this App and Stage, then reopen this
						workspace.
					</div>
				</div>
			</q-card>
		</DashboardPageContent>
	</DashboardPage>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import { LocalWorkspace } from "@/components/LocalWorkspace";
import {
	DashboardPage,
	DashboardPageBreadcrumbs,
	DashboardPageContent,
	DashboardPageHeader,
} from "@/components/ui/Dashboard";
import { localSessionMatchesStage } from "@/composables/local";
import { useLocalSessionStore } from "@/stores/local-session";

const route = useRoute();
const localSession = useLocalSessionStore();
const isContextual = computed(() => route.name === "stage-local-workspace");
const appName = computed(() => String(route.params.appName ?? ""));
const stageName = computed(() => String(route.params.stageName ?? ""));
const hasMatchingSession = computed(() => {
	if (!isContextual.value) return Boolean(localSession.identity);
	return localSessionMatchesStage(localSession.identity, {
		appName: appName.value,
		stageName: stageName.value,
	});
});
const subtitle = computed(() => {
	const identity = localSession.identity;
	if (!identity)
		return "Live invocation activity from your local SST dev environment.";
	return `${identity.app} / ${identity.stage}`;
});
const breadcrumbs = computed(() => [
	{ label: "Apps", to: { name: "apps" } },
	{
		label: appName.value,
		to: { name: "app-detail", params: { appName: appName.value } },
	},
	{
		label: stageName.value,
		to: {
			name: "stage-detail",
			params: { appName: appName.value, stageName: stageName.value },
		},
	},
	{ label: "Local Workspace" },
]);
</script>

<style scoped lang="scss">
.local-workspace-page__content {
	height: 74vh;
}
</style>
