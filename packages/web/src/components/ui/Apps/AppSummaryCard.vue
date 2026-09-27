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
						Updated {{ formattedUpdatedAt }}
					</div>
				</div>
			</div>

			<AppSummaryMetrics
				:stage-count="app.stages.length"
				:account-count="accountCount"
				:region-count="regionCount"
				:resource-count="resourceCount"
			/>

			<AppStagePreviews :app-name="app.appName" :stages="app.stages" />
		</q-card-section>
	</q-card>
</template>

<script setup lang="ts">
import type { App } from "@sst-console/sdk";
import { computed } from "vue";

import { formatDateTime } from "@/components/ui/format";

import AppStagePreviews from "./AppStagePreviews.vue";
import AppSummaryMetrics from "./AppSummaryMetrics.vue";

const props = defineProps<{ app: App }>();

const appRoute = computed(() => ({
	name: "app-detail",
	params: { appName: props.app.appName }
}));

const accountCount = computed(
	() => new Set(props.app.stages.map(stage => stage.accountId)).size
);

const regionCount = computed(
	() => new Set(props.app.stages.map(stage => stage.region)).size
);

const resourceCount = computed(() =>
	props.app.stages.reduce((total, stage) => total + stage.resourceCount, 0)
);

const formattedUpdatedAt = computed(() => formatDateTime(props.app.updatedAt));
</script>

<style scoped lang="scss">
.app-summary-card__section {
	display: grid;
	gap: 1rem;
}

.app-summary-card__header {
	display: grid;
	grid-template-columns: 1.75rem minmax(0, 1fr);
	align-items: center;
	gap: 0.75rem;
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
