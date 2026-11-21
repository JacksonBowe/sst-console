<template>
	<q-layout view="lHh Lpr lFf">
		<ConsoleHeader v-if="$q.screen.lt.md">
			<q-btn
				flat
				round
				icon="sym_r_menu"
				aria-label="Open navigation"
				@click="drawerOpen = true"
			/>
			<q-toolbar-title class="text-body1 text-weight-medium">
				SST Console
			</q-toolbar-title>
		</ConsoleHeader>

		<ConsoleSidebar v-model="drawerOpen" />

		<q-page-container>
			<div
				:class="{
					'console-layout__content--centered':
						uiSettings.contentWidth === 'centered' &&
						!route.meta.fullWidth
				}"
			>
				<router-view />
			</div>
		</q-page-container>
	</q-layout>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar";
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute } from "vue-router";

import { ConsoleHeader, ConsoleSidebar } from "@/components/Console";
import { useLocalSessionStore } from "@/stores/local-session";
import { useUISettingsStore } from "@/stores/ui-settings";

const drawerOpen = ref(false);
const $q = useQuasar();
const localSession = useLocalSessionStore();
const uiSettings = useUISettingsStore();
const route = useRoute();

onMounted(() => void localSession.initialize());
onBeforeUnmount(() => localSession.stop());
</script>

<style scoped>
.console-layout__content--centered {
	max-width: 1248px;
	margin-inline: auto;
}
</style>
