<template>
	<q-page class="dashboard-page">
		<slot />
	</q-page>
</template>

<script setup lang="ts"></script>

<style lang="scss" scoped>
.dashboard-page {
	background-color: var(--page);
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	height: 100dvh;
	min-height: 0;
	overflow: hidden;
	padding: 48px 24px 24px;
}

@media (max-width: 599.98px) {
	.dashboard-page {
		height: auto;
		min-height: 100dvh;
		overflow: visible;
		padding: 20px 16px;
	}
}
</style>
