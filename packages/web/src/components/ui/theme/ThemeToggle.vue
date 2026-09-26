<template>
	<q-btn
		flat
		round
		:icon="dark ? 'sym_r_light_mode' : 'sym_r_dark_mode'"
		aria-label="Toggle theme"
	/>
</template>

<script setup lang="ts">
defineProps<{
	dark?: boolean;
}>();
</script>
