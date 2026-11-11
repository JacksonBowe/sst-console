<template>
	<DashboardPage>
		<DashboardPageBreadcrumbs :segments="breadcrumbs" class="q-mb-md" />
		<DashboardPageHeader
			:title="stage?.stageName ?? stageName"
			icon="sym_r_account_tree"
		>
			<template #subtitle>
				<div class="text-body2 q-mt-xs">
					<div
						v-if="stageQuery.isPending.value"
						class="row items-center q-gutter-sm"
						aria-label="Loading stage context"
					>
						<q-skeleton type="text" width="8rem" />
						<q-skeleton type="text" width="7rem" />
						<q-skeleton type="text" width="12rem" />
					</div>
					<div
						v-else-if="stage"
						class="row items-center q-gutter-x-sm"
					>
						<router-link
							:to="{
								name: 'account-detail',
								params: { accountId: stage.accountId }
							}"
							class="stage-account-link text-primary"
							style="opacity: 1"
							>{{ stage.accountId }}</router-link
						>
						<span>·</span>
						<span class="text-muted">{{ stage.region }}</span>
						<span>·</span>
						<span
							v-if="stage.state"
							:title="stage.state.sourceKey"
							class="text-muted"
							>State observed
							{{ formatTimestamp(stage.state.observedAt) }}</span
						>
						<span v-else>No state</span>
					</div>
				</div>
			</template>
			<template #actions>
				<q-btn
					v-if="!issuesQuery.isError.value && stageOpenIssues.length"
					flat
					round
					dense
					no-caps
					color="primary"
					icon="sym_r_error"
					:aria-label="`${stageOpenIssues.length} open ${stageOpenIssues.length === 1 ? 'issue' : 'issues'}`"
					:to="issuesRoute"
				>
					<q-badge color="negative" floating>{{
						stageOpenIssues.length
					}}</q-badge>
					<q-tooltip
						>{{ stageOpenIssues.length }} open
						{{
							stageOpenIssues.length === 1 ? "issue" : "issues"
						}}</q-tooltip
					>
				</q-btn>
				<PillTabs
					:model-value="activeTab"
					:options="tabs"
					@update:model-value="setTab"
				/>
				<q-btn
					flat
					round
					dense
					icon="sym_r_more_vert"
					aria-label="Stage actions"
					:disable="!stage || stageQuery.isPending.value"
				>
					<q-menu
						class="stage-actions-menu"
						anchor="bottom right"
						self="top right"
						:offset="[0, 8]"
					>
						<div class="q-pa-sm" style="min-width: 12rem">
							<q-item
								:active="stage?.issueMonitoringEnabled ?? false"
								:aria-checked="
									stage?.issueMonitoringEnabled ?? false
								"
								:disable="
									setStageIssueMonitoring.isPending.value
								"
								class="stage-actions-menu__item q-px-sm q-py-xs"
								clickable
								dense
								role="menuitemcheckbox"
								@click="
									toggleMonitoring(
										!stage?.issueMonitoringEnabled
									)
								"
							>
								<q-item-section
									>Issue monitoring</q-item-section
								>
								<q-item-section
									v-if="stage?.issueMonitoringEnabled"
									side
								>
									<q-icon
										name="sym_r_check"
										color="primary"
									/>
								</q-item-section>
							</q-item>
						</div>
					</q-menu>
				</q-btn>
			</template>
		</DashboardPageHeader>

		<DashboardPageContent>
			<StageDetailErrorState
				v-if="stageQuery.isError.value"
				:not-found="isNotFound"
				@retry="stageQuery.refetch()"
			/>
			<ResourceExplorer
				v-else-if="activeTab === 'overview'"
				:resources="visibleResources"
				:loading="stageQuery.isPending.value"
			/>
		</DashboardPageContent>
	</DashboardPage>
</template>

<script setup lang="ts">
import { ApiError } from "@sst-console/sdk";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
	ResourceExplorer,
	StageDetailErrorState
} from "@/components/App/Detail/Stage";
import {
	DashboardPage,
	DashboardPageBreadcrumbs,
	DashboardPageContent,
	DashboardPageHeader
} from "@/components/ui/Dashboard";
import { formatDateTime } from "@/components/ui/format";
import { PillTabs } from "@/components/ui/PillTabs";
import { useSetStageIssueMonitoring, useStage } from "@/composables/apps";
import {
	getStageResourceCategory,
	resourcesForStageCategory,
	type StageResourceCategory
} from "@/composables/apps/stage-resources";
import { useIssues } from "@/composables/issues";

const route = useRoute();
const router = useRouter();
const tabs = [
	{ label: "Overview", value: "overview" },
	{ label: "Updates", value: "updates" }
];
const activeTab = computed(() =>
	route.query.tab === "updates" ? "updates" : "overview"
);

function setTab(tab: string) {
	void router.push({
		query: {
			...route.query,
			tab: tab === "updates" ? "updates" : undefined
		}
	});
}
const appName = computed(() => String(route.params.appName ?? ""));
const stageName = computed(() => String(route.params.stageName ?? ""));
const stageQuery = useStage(appName, stageName);
const issuesQuery = useIssues({});
const stage = computed(() => stageQuery.data.value);
const setStageIssueMonitoring = useSetStageIssueMonitoring();
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
const stageOpenIssues = computed(() =>
	(issuesQuery.data.value ?? []).filter(
		issue =>
			issue.status === "open" &&
			issue.appName === appName.value &&
			issue.stageName === stageName.value
	)
);
const issuesRoute = computed(() => ({
	name: "monitoring",
	query: { app: appName.value, stage: stageName.value, status: "open" }
}));
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

function toggleMonitoring(enabled: boolean) {
	if (!appName.value || !stageName.value || !stage.value) return;
	setStageIssueMonitoring.mutate({
		appName: appName.value,
		stageName: stageName.value,
		enabled
	});
}

function formatTimestamp(value: string) {
	if (Number.isNaN(new Date(value).getTime())) return "Unavailable";
	return formatDateTime(value);
}
</script>

<style scoped lang="scss">
.stage-actions-menu {
	background: var(--q-page);
	color: var(--q-text-primary);
	border: 1px solid var(--q-border);
	border-radius: $generic-border-radius;
	box-shadow: 0 8px 24px
		color-mix(in srgb, var(--q-text-primary) 12%, transparent);
}

.stage-actions-menu__item {
	border-radius: $generic-border-radius;

	&:hover {
		background: var(--q-secondary-3);
	}

	&.q-item--active {
		background: var(--q-secondary-2);
		color: var(--q-text-primary);
	}
}

.stage-account-link {
	text-decoration: none;
}

.stage-account-link:hover {
	text-decoration: underline;
}
</style>
