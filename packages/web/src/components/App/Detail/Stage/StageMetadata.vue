<template>
	<q-card flat bordered>
		<q-card-section class="stage-metadata">
			<div>
				<div class="stage-metadata__label">App</div>
				<router-link
					:to="{
						name: 'app-detail',
						params: { appName: stage.appName }
					}"
					class="stage-metadata__link"
				>
					{{ stage.appName }}
				</router-link>
			</div>
			<div>
				<div class="stage-metadata__label">Account</div>
				<router-link
					:to="{
						name: 'account-detail',
						params: { accountId: stage.accountId }
					}"
					class="stage-metadata__link text-mono"
				>
					{{ stage.accountId }}
				</router-link>
			</div>
			<div>
				<div class="stage-metadata__label">Region</div>
				<div>{{ stage.region }}</div>
			</div>
			<div>
				<div class="stage-metadata__label">Resources</div>
				<div>{{ counts.resources }}</div>
			</div>
			<div>
				<div class="stage-metadata__label">Components</div>
				<div>{{ counts.components }}</div>
			</div>
			<div>
				<div class="stage-metadata__label">Monitoring</div>
				<q-badge
					:color="
						stage.issueMonitoringEnabled ? 'positive' : 'secondary'
					"
					:label="
						stage.issueMonitoringEnabled ? 'Enabled' : 'Disabled'
					"
				/>
			</div>
			<div>
				<div class="stage-metadata__label">State observed</div>
				<div v-if="stage.state" :title="stage.state.sourceKey">
					{{ formatTimestamp(stage.state.observedAt) }}
				</div>
				<div v-else class="text-secondary">No state</div>
			</div>
		</q-card-section>
	</q-card>
</template>

<script setup lang="ts">
import type { Stage } from "@sst-console/sdk";
import { computed } from "vue";

import { formatDateTime } from "@/components/ui/format";
import { stageResourceCounts } from "@/composables/apps/stage-resources";

const props = defineProps<{ stage: Stage }>();

const counts = computed(() => stageResourceCounts(props.stage.resources));

function formatTimestamp(value: string) {
	if (Number.isNaN(new Date(value).getTime())) return "Unavailable";
	return formatDateTime(value);
}
</script>

<style scoped lang="scss">
.stage-metadata {
	display: grid;
	grid-template-columns: repeat(7, minmax(0, 1fr));
	gap: 1rem;
}

.stage-metadata__label {
	color: var(--q-text-secondary);
	font-size: 0.75rem;
	margin-bottom: 0.25rem;
}

.stage-metadata__link {
	color: var(--q-primary);
	text-decoration: none;
}

.stage-metadata__link:hover {
	text-decoration: underline;
}

@media (max-width: 899px) {
	.stage-metadata {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

@media (max-width: 599px) {
	.stage-metadata {
		grid-template-columns: 1fr;
	}
}
</style>
