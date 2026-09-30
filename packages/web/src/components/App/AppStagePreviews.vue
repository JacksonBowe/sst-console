<template>
	<div class="app-stage-previews">
		<span class="app-stage-previews__label">Stages</span>
		<q-btn
			v-for="stage in stages"
			:key="`${stage.accountId}:${stage.stageName}`"
			flat
			dense
			no-caps
			:color="isLocalStage(stage) ? 'positive' : 'primary'"
			:label="stage.stageName"
			:aria-label="`Open ${stage.stageName} Stage`"
			:to="{
				name: 'stage-detail',
				params: { appName, stageName: stage.stageName }
			}"
		/>
	</div>
</template>

<script setup lang="ts">
import type { AppStage } from "@sst-console/sdk";

import { localSessionIsLiveForStage } from "@/composables/local";
import { useLocalSessionStore } from "@/stores/local-session";

const props = defineProps<{
	appName: string;
	stages: AppStage[];
}>();

const localSession = useLocalSessionStore();

function isLocalStage(stage: AppStage) {
	return localSessionIsLiveForStage(
		localSession.status,
		localSession.identity,
		{
			appName: props.appName,
			stageName: stage.stageName,
			region: stage.region
		}
	);
}
</script>

<style scoped lang="scss">
.app-stage-previews {
	display: flex;
	align-items: center;
	justify-content: flex-start;
	gap: 0.5rem;
	min-height: 1.75rem;
	min-width: 0;
	flex-wrap: wrap;
}

.app-stage-previews__label {
	color: var(--q-text-secondary);
	font-size: 0.75rem;
}
</style>
