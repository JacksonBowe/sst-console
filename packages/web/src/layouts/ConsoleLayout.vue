<template>
	<q-layout view="lHh Lpr lFf">
		<AppHeader v-if="$q.screen.lt.md">
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
		</AppHeader>

		<ConsoleSidebar v-model="drawerOpen" />

		<q-page-container>
			<router-view />
		</q-page-container>
	</q-layout>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar";
import { ref } from "vue";

import { AppHeader, ConsoleSidebar } from "@/components/ui/App";

const drawerOpen = ref(false);
const $q = useQuasar();
</script>

<style lang="scss" scoped></style>
