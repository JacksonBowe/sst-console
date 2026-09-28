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
				<div>{{ resourceCount }}</div>
			</div>
			<div>
				<div class="stage-metadata__label">Latest snapshot</div>
				<div
					v-if="stage.latestSnapshot"
					:title="stage.latestSnapshot.snapshotId"
				>
					{{ formatTimestamp(stage.latestSnapshot.createdAt) }}
				</div>
				<div v-else class="text-secondary">No snapshot</div>
			</div>
		</q-card-section>
	</q-card>
</template>

<script setup lang="ts">
import type { ResourceTree, Stage } from "@sst-console/sdk";
import { computed } from "vue";

import { formatDateTime } from "@/components/ui/format";

const props = defineProps<{ stage: Stage }>();

const resourceCount = computed(() => countResources(props.stage.resources));

function countResources(resources: ResourceTree[]): number {
	return resources.reduce(
		(count, resource) => count + 1 + countResources(resource.children),
		0
	);
}

function formatTimestamp(value: string) {
	if (Number.isNaN(new Date(value).getTime())) return "Unavailable";
	return formatDateTime(value);
}
</script>

<style scoped lang="scss">
.stage-metadata {
	display: grid;
	grid-template-columns: repeat(5, minmax(0, 1fr));
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
