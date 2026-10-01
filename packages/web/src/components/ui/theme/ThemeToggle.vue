<template>
	<AppDrawerItem
		:item="item"
		:aria-label="dark ? 'Switch to light theme' : 'Switch to dark theme'"
		:aria-pressed="dark"
		@click="toggleTheme"
		dense
	/>
</template>

<script setup lang="ts">
import { computed } from "vue";

import { AppDrawerItem, type DrawerNavItem } from "@/components/ui/Drawer";
import { useTheme } from "@/composables/theme";

const { dark, toggleTheme } = useTheme();

const item = computed<DrawerNavItem>(() => ({
	label: dark.value ? "Switch to light theme" : "Switch to dark theme",
	icon: dark.value ? "sym_r_light_mode" : "sym_r_dark_mode",
}));
</script>
