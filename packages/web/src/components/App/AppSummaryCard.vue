<template>
	<q-card flat bordered class="app-summary-card">
		<q-card-section class="app-summary-card__section q-pa-lg">
			<div class="app-summary-card__header">
				<q-icon
					name="sym_r_deployed_code"
					size="28px"
					color="primary"
				/>
				<div class="col">
					<router-link :to="appRoute" class="app-summary-card__title">
						{{ app.appName }}
					</router-link>
					<div class="text-caption text-secondary q-mt-xs">
						Last synced {{ relativeUpdatedAt }}
					</div>
				</div>
				<div class="row items-center no-wrap">
					<q-btn
						v-if="monitoringEnabled"
						flat
						dense
						round
						icon="sym_r_notifications"
						:to="issuesRoute"
						:aria-label="`${openIssues.length} open ${openIssues.length === 1 ? 'issue' : 'issues'}`"
					>
						<q-badge
							v-if="openIssues.length"
							floating
							rounded
							color="negative"
							:label="openIssues.length"
						/>
					</q-btn>
					<q-btn
						flat
						dense
						round
						icon="sym_r_more_vert"
						aria-label="App actions"
					/>
				</div>
			</div>

			<div class="app-summary-card__metrics">
				<div class="app-summary-card__metric">
					<div class="text-h6">{{ accountCount }}</div>
					<div class="text-caption text-secondary">Accounts</div>
				</div>
				<div class="app-summary-card__metric">
					<div class="text-h6">{{ resourceCount }}</div>
					<div class="text-caption text-secondary">
						Resources · {{ largestStageResourceCount }} max/stage
					</div>
				</div>
			</div>

			<q-separator />
			<div class="row items-center">
				<AppStagePreviews
					class="col"
					:app-name="app.appName"
					:stages="app.stages"
				/>
			</div>
		</q-card-section>
	</q-card>
</template>

<script setup lang="ts">
import type { AppSummary, Issue } from "@sst-console/sdk";
import { computed } from "vue";

import AppStagePreviews from "./AppStagePreviews.vue";

// TODO: Replace per-stage snapshot/resource reads in App.list({ summaries: true })
// with a list-summary projection that includes resource counts.
const props = defineProps<{ app: AppSummary; openIssues: Issue[] }>();

const appRoute = computed(() => ({
	name: "app-detail",
	params: { appName: props.app.appName }
}));

const accountCount = computed(
	() => new Set(props.app.stages.map(stage => stage.accountId)).size
);

const resourceCount = computed(() =>
	props.app.stages.reduce((total, stage) => total + stage.resourceCount, 0)
);
const largestStageResourceCount = computed(() =>
	Math.max(...props.app.stages.map(stage => stage.resourceCount), 0)
);

const relativeUpdatedAt = computed(() => relativeTime(props.app.updatedAt));
const monitoringEnabled = computed(() =>
	props.app.stages.some(stage => stage.issueMonitoringEnabled)
);
const issuesRoute = computed(() => ({
	name: "monitoring",
	query: { app: props.app.appName, status: "open" }
}));

function relativeTime(timestamp: string) {
	const elapsed = Math.max(0, Date.now() - new Date(timestamp).getTime());
	if (elapsed < 60_000) return "just now";

	const units = [
		["year", 31_536_000_000],
		["month", 2_592_000_000],
		["day", 86_400_000],
		["hour", 3_600_000],
		["minute", 60_000]
	] as const;
	const [unit, duration] = units.find(([, duration]) => elapsed >= duration)!;
	const count = Math.floor(elapsed / duration);
	return `${count} ${unit}${count === 1 ? "" : "s"} ago`;
}
</script>

<style scoped lang="scss">
.app-summary-card__section {
	display: grid;
	gap: 1rem;
}

.app-summary-card__header {
	display: grid;
	grid-template-columns: 1.75rem minmax(0, 1fr) auto;
	align-items: center;
	gap: 0.75rem;
}

.app-summary-card__metrics {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
}

.app-summary-card__metric {
	border-left: 1px solid var(--q-border);
	padding-left: 0.75rem;
}

.app-summary-card__metric:first-child {
	border-left: 0;
	padding-left: 0;
}

.app-summary-card__title {
	color: var(--q-text-primary);
	font-size: 1rem;
	font-weight: 650;
	text-decoration: none;
}

.app-summary-card__title:hover {
	color: var(--q-primary);
	text-decoration: underline;
}
</style>
