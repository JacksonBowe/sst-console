<template>
	<q-btn
		flat
		no-caps
		icon="sym_r_refresh"
		label="Refresh discovery"
		:loading="refreshing"
		@click="$emit('refresh')"
	/>
	<q-btn
		unelevated
		no-caps
		color="primary"
		icon="sym_r_sync"
		label="Apply and sync"
		:disable="!canApply"
		:loading="applying"
		@click="$emit('apply')"
	/>
</template>

<script setup lang="ts">
defineProps<{
	refreshing: boolean;
	applying: boolean;
	canApply: boolean;
}>();

defineEmits<{
	refresh: [];
	apply: [];
}>();
</script>
