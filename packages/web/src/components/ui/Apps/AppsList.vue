<template>
	<div v-if="loading" class="apps-list">
		<q-card v-for="index in 6" :key="index" flat bordered class="q-pa-lg">
			<div class="row items-center q-gutter-sm q-mb-lg">
				<q-skeleton type="QAvatar" />
				<q-skeleton type="text" width="35%" />
			</div>
			<q-skeleton type="text" width="50%" class="q-mb-lg" />
			<div class="row justify-between q-gutter-sm">
				<q-skeleton
					v-for="item in 4"
					:key="item"
					type="text"
					width="15%"
				/>
			</div>
		</q-card>
	</div>

	<div v-else class="apps-list">
		<AppSummaryCard v-for="app in apps" :key="app.appName" :app="app" />
	</div>
</template>

<script setup lang="ts">
import type { App } from "@sst-console/sdk";

import AppSummaryCard from "./AppSummaryCard.vue";

defineProps<{
	apps: App[];
	loading: boolean;
}>();
</script>

<style scoped lang="scss">
.apps-list {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr));
	gap: 1rem;
}
</style>
