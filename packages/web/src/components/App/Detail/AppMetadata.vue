<template>
	<q-card flat bordered>
		<q-card-section class="app-metadata">
			<div>
				<div class="app-metadata__label">Stages</div>
				<div>{{ app.stages.length }}</div>
			</div>
			<div>
				<div class="app-metadata__label">Created</div>
				<div :title="app.createdAt">{{
					formatTimestamp(app.createdAt)
				}}</div>
			</div>
			<div>
				<div class="app-metadata__label">Updated</div>
				<div :title="app.updatedAt">{{
					formatTimestamp(app.updatedAt)
				}}</div>
			</div>
		</q-card-section>
	</q-card>
</template>

<script setup lang="ts">
import type { App } from "@sst-console/sdk";

import { formatDateTime } from "@/components/ui/format";

defineProps<{ app: App }>();

function formatTimestamp(value: string) {
	if (Number.isNaN(new Date(value).getTime())) return "Unavailable";
	return formatDateTime(value);
}
</script>

<style scoped lang="scss">
.app-metadata {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 1rem;
}

.app-metadata__label {
	color: var(--q-text-secondary);
	font-size: 0.75rem;
	margin-bottom: 0.25rem;
}

@media (max-width: 599px) {
	.app-metadata {
		grid-template-columns: 1fr;
	}
}
</style>
