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
				<div
					class="row items-center no-wrap text-captio text-secondary"
					aria-label="Local session status"
				>
					<div class="row items-center no-wrap">
						<q-icon
							:name="connectionIcon"
							:color="connectionColor"
							size="16px"
							class="q-mr-xs"
						/>
						<span>WebSocket {{ connectionLabel }}</span>
					</div>
					<q-separator vertical inset class="q-mx-sm" />
					<div class="row items-center no-wrap">
						<q-icon
							:name="
								localSession.isStreaming
									? 'sym_r_play_circle'
									: 'sym_r_pause_circle'
							"
							:color="
								localSession.isStreaming
									? 'positive'
									: 'warning'
							"
							size="16px"
							class="q-mr-xs"
						/>
						<span>
							Streaming
							{{ localSession.isStreaming ? "live" : "paused" }}
						</span>
					</div>
					<q-separator vertical inset class="q-mx-sm" />
					<span>{{ localSession.invocations.length }} retained</span>
					<template v-if="lastEventLabel">
						<q-separator vertical inset class="q-mx-sm" />
						<span>Last event {{ lastEventLabel }}</span>
					</template>
				</div>
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
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute } from "vue-router";

import { LocalWorkspace } from "@/components/LocalWorkspace";
import {
	DashboardPage,
	DashboardPageBreadcrumbs,
	DashboardPageContent,
	DashboardPageHeader
} from "@/components/ui/Dashboard";
import { localSessionMatchesStage } from "@/composables/local";
import { useLocalSessionStore } from "@/stores/local-session";

const route = useRoute();
const localSession = useLocalSessionStore();
const now = ref(Date.now());
let clock: number | undefined;

onMounted(() => {
	clock = window.setInterval(() => {
		now.value = Date.now();
	}, 1_000);
});

onUnmounted(() => {
	if (clock !== undefined) window.clearInterval(clock);
});

const isContextual = computed(() => route.name === "stage-local-workspace");
const appName = computed(() => String(route.params.appName ?? ""));
const stageName = computed(() => String(route.params.stageName ?? ""));
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
const connectionColor = computed(() =>
	localSession.status === "connected"
		? "positive"
		: localSession.status === "connecting"
			? "warning"
			: "secondary"
);
const connectionIcon = computed(() =>
	localSession.status === "connected"
		? "sym_r_check_circle"
		: localSession.status === "connecting"
			? "sym_r_sync"
			: "sym_r_cancel"
);
const connectionLabel = computed(
	() =>
		`${localSession.status[0]?.toUpperCase()}${localSession.status.slice(1)}`
);
const lastEventLabel = computed(() => {
	if (!localSession.lastEventAt) return undefined;
	const seconds = Math.max(
		0,
		Math.floor((now.value - localSession.lastEventAt) / 1000)
	);
	return seconds < 60
		? `${seconds}s ago`
		: `${Math.floor(seconds / 60)}m ago`;
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
