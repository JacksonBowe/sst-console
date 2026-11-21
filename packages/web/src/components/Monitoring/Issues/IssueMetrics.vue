<template>
	<div class="row q-col-gutter-sm">
		<div v-for="metric in metrics" :key="metric.label" class="col-4">
			<q-card
				flat
				bordered
				class="q-pa-sm full-height"
				role="group"
				:aria-label="metric.label"
			>
				<template v-if="$q.screen.lt.sm">
					<div
						class="row no-wrap items-center justify-between q-gutter-x-sm"
					>
						<q-icon
							:name="metric.icon"
							color="primary"
							size="20px"
						/>
						<div class="col text-right text-h6 issue-metric__text">
							{{ metric.value }}
						</div>
					</div>
					<div class="text-caption issue-metric__text">
						{{ metric.mobileLabel ?? metric.label }}
					</div>
				</template>
				<div v-else class="row no-wrap items-center">
					<q-icon
						:name="metric.icon"
						color="primary"
						size="sm"
						class="q-mr-md"
					/>
					<div class="col issue-metric__text">
						<div class="text-h6">{{ metric.value }}</div>
						<div class="text-caption">{{ metric.label }}</div>
					</div>
				</div>
			</q-card>
		</div>
	</div>
</template>

<script setup lang="ts">
defineProps<{
	metrics: {
		label: string;
		mobileLabel?: string;
		value: string | number;
		icon: string;
	}[];
}>();
</script>

<style scoped>
.issue-metric__text {
	overflow-wrap: anywhere;
}
</style>
