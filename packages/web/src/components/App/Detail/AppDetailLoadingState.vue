<template>
	<q-card flat bordered>
		<q-card-section>
			<q-skeleton type="text" width="20%" class="q-mb-md" />
			<q-skeleton v-for="index in 5" :key="index" type="text" />
		</q-card-section>
	</q-card>
</template>
