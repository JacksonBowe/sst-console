<template>
	<q-layout view="hHh lpR fFf">
		<q-page-container>
			<q-page
				class="auth-page column items-center justify-center q-pa-md"
			>
				<router-view />
			</q-page>
		</q-page-container>
	</q-layout>
</template>

<style lang="scss" scoped>
.auth-page {
	background-color: var(--q-page);
}
</style>
