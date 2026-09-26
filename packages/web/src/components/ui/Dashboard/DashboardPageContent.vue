<template>
	<div class="dashboard-page-content">
		<slot />
	</div>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
.dashboard-page-content {
	display: flex;
	flex-direction: column;
	flex: 1;
	gap: 16px;
	min-height: 0;
}
</style>
