<template>
	<q-btn
		flat
		round
		:icon="dark ? 'sym_r_light_mode' : 'sym_r_dark_mode'"
		:aria-label="dark ? 'Switch to light theme' : 'Switch to dark theme'"
		:aria-pressed="dark"
		@click="toggleTheme"
	/>
</template>

<script setup lang="ts">
import { useTheme } from "@/composables/theme";

const { dark, toggleTheme } = useTheme();
</script>
