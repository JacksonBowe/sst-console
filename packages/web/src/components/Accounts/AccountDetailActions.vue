<template>
	<q-btn
		flat
		no-caps
		icon="sym_r_refresh"
		:label="$q.screen.lt.sm ? undefined : 'Refresh discovery'"
		aria-label="Refresh discovery"
		:loading="refreshing"
		@click="$emit('refresh')"
	/>
	<q-btn
		unelevated
		no-caps
		color="primary"
		icon="sym_r_sync"
		:label="$q.screen.lt.sm ? undefined : 'Apply and sync'"
		aria-label="Apply and sync"
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
