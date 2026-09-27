<template>
	<q-page class="dashboard-page q-pa-lg">
		<slot />
	</q-page>
</template>

<script setup lang="ts"></script>

<style lang="scss" scoped>
.dashboard-page {
	background-color: var(--q-page);
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	min-height: 100%;
}
</style>
