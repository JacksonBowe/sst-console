<template>
	<q-card flat bordered class="q-pa-xl">
		<div class="column items-center text-center q-gutter-sm">
			<q-icon name="sym_r_error" size="40px" color="negative" />
			<div class="text-h6">Unable to load Accounts</div>
			<div class="text-body2 text-secondary">
				Check your connection, then try again.
			</div>
			<q-btn
				unelevated
				no-caps
				color="primary"
				label="Retry"
				@click="$emit('retry')"
			/>
		</div>
	</q-card>
</template>

<script setup lang="ts">
defineEmits<{ retry: [] }>();
</script>
