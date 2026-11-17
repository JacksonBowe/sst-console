<template>
	<div class="row q-col-gutter-sm">
		<div v-for="metric in metrics" :key="metric.label" class="col-4">
			<q-card
				flat
				bordered
				class="q-pa-sm row items-center no-wrap full-height"
			>
				<q-icon
					:name="metric.icon"
					color="primary"
					size="sm"
					class="q-mr-md"
				/>
				<div>
					<div class="text-h6">{{ metric.value }}</div>
					<div class="text-caption">{{ metric.label }}</div>
				</div>
			</q-card>
		</div>
	</div>
</template>

<script setup lang="ts">
defineProps<{
	metrics: { label: string; value: string | number; icon: string }[];
}>();
</script>
