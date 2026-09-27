<template>
	<q-page class="column flex-center q-pa-xl text-center">
		<p class="text-h3 q-my-none">404</p>
		<h1 class="text-h6 q-mt-md q-mb-sm">Page not found</h1>
		<p class="text-body2 text-secondary q-mt-none">
			This page does not exist.
		</p>
		<q-btn
			color="primary"
			:to="{ name: 'apps' }"
			label="Return to Apps"
			no-caps
		/>
	</q-page>
</template>
