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
			<router-view />
		</q-page-container>
	</q-layout>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar";
import { onBeforeUnmount, onMounted, ref } from "vue";

import { ConsoleHeader, ConsoleSidebar } from "@/components/Console";
import { useLocalSessionStore } from "@/stores/local-session";

const drawerOpen = ref(false);
const $q = useQuasar();
const localSession = useLocalSessionStore();

onMounted(() => localSession.start());
onBeforeUnmount(() => localSession.stop());
</script>

<style lang="scss" scoped></style>
