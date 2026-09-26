<template>
	<q-header bordered class="app-header">
		<q-toolbar>
			<slot />
		</q-toolbar>
	</q-header>
</template>

<style lang="scss" scoped>
.app-header {
	background: var(--q-page);
	color: #1d1d1d;
}

:global(.body--dark) .app-header {
	color: #f5f5f5;
}
</style>
