<template>
	<DashboardPageHeader :title="title" :subtitle="subtitle" :icon="icon">
		<template v-if="showFunctionSession" #actions>
			<LocalFunctionSessionStatus
				:status="localSession.status"
				:is-streaming="localSession.isStreaming"
				:invocations="localSession.invocations"
				:last-event-at="localSession.lastEventAt"
			/>
		</template>
	</DashboardPageHeader>
</template>

<script setup lang="ts">
import type { Stage } from "@sst-console/sdk";
import { computed } from "vue";
import { useRoute } from "vue-router";

import { DashboardPageHeader } from "@/components/ui/Dashboard";
import { localSessionMatchesStage } from "@/composables/local";
import { useLocalSessionStore } from "@/stores/local-session";
import LocalFunctionSessionStatus from "./Functions/LocalFunctionSessionStatus.vue";

const props = defineProps<{
	stage?: Stage | undefined;
	title: string;
	subtitle?: string | undefined;
	icon?: string | undefined;
}>();

const route = useRoute();
const localSession = useLocalSessionStore();
const showFunctionSession = computed(
	() =>
		route.name === "stage-functions" &&
		localSessionMatchesStage(localSession.identity, props.stage)
);
</script>
