<template>
	<q-header
		bordered
		class="console-header"
		:class="$q.dark.isActive ? 'bg-dark' : 'bg-white'"
	>
		<q-toolbar>
			<slot />
		</q-toolbar>
	</q-header>
</template>

<style lang="scss" scoped>
.console-header {
	color: var(--q-text-primary);
}
</style>
