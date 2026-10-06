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
		</DashboardPageHeader>

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
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { Notify } from "quasar";

import { LocalWorkspace } from "@/components/LocalWorkspace";
import {
	DashboardPage,
	DashboardPageBreadcrumbs,
	DashboardPageContent,
	DashboardPageHeader
} from "@/components/ui/Dashboard";
import { localSessionMatchesStage } from "@/composables/local";
import { api, handleApiError } from "@/boot/api-client";
import { useLocalSessionStore } from "@/stores/local-session";

const route = useRoute();
const localSession = useLocalSessionStore();
const isContextual = computed(() => route.name === "stage-local-workspace");
const appName = computed(() => String(route.params.appName ?? ""));
const stageName = computed(() => String(route.params.stageName ?? ""));
const connecting = ref(false);
const disconnecting = ref(false);
const testing = ref(false);
const target = computed(() => {
	const app = isContextual.value ? appName.value : localSession.identity?.app;
	const stage = isContextual.value
		? stageName.value
		: localSession.identity?.stage;
	return app && stage ? { app, stage } : undefined;
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
const hasMatchingSession = computed(() => {
	if (!isContextual.value) return Boolean(localSession.identity);
	return localSessionMatchesStage(localSession.identity, {
		appName: appName.value,
		stageName: stageName.value
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
		to: { name: "app-detail", params: { appName: appName.value } }
	},
	{
		label: stageName.value,
		to: {
			name: "stage-detail",
			params: { appName: appName.value, stageName: stageName.value }
		}
	},
	{ label: "Local Workspace" }
]);
</script>

<style scoped lang="scss">
.local-workspace-page__content {
	height: 74vh;
}
</style>
