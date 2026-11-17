<template>
	<q-btn outline no-caps icon="sym_r_filter_list" label="Filters">
		<q-badge
			v-if="active"
			floating
			color="primary"
			aria-label="Filters active"
		/>
	</q-btn>
</template>

<script setup lang="ts">
defineProps<{ active: boolean }>();
</script>
