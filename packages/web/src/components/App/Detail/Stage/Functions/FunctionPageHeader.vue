<template>
	<div class="function-page-header">
		<div class="function-page-header__context row items-center">
			<div
				class="function-page-header__context-item row items-center q-gutter-sm"
			>
				<q-icon
					name="sym_r_deployed_code"
					size="28px"
					color="primary"
				/>
				<div class="text-subtitle1 text-weight-bold">{{ appName }}</div>
				<q-badge
					v-if="isLocal"
					outline
					color="positive"
					label="Local"
				/>
			</div>
			<div class="function-page-header__context-item text-body2">
				<span class="text-secondary">Stage:</span> {{ stageName }}
			</div>
			<div class="function-page-header__context-item text-body2">
				<span class="text-secondary">Region:</span> {{ region }}
			</div>
		</div>
		<q-separator class="q-my-md" />
		<DashboardPageHeader>
			<div class="row items-center q-gutter-sm">
				<q-icon name="sym_r_functions" size="28px" color="primary" />
				<div>
					<div class="text-h5 text-weight-bold">Functions</div>
					<div v-if="isLocal" class="text-body2 text-secondary">
						Live invocation activity from your local SST dev
						environment.
					</div>
				</div>
			</div>
			<div class="function-page-header__session-status">
				<slot name="sessionStatus" />
			</div>
		</DashboardPageHeader>
	</div>
</template>

<script setup lang="ts">
import { DashboardPageHeader } from "@/components/ui/Dashboard";

defineProps<{
	appName: string;
	stageName: string;
	region: string;
	isLocal: boolean;
}>();
</script>

<style scoped lang="scss">
.function-page-header__context {
	gap: 0.75rem;
	flex-wrap: wrap;
}

.function-page-header__context-item + .function-page-header__context-item {
	border-left: 1px solid var(--q-separator-color);
	padding-left: 0.75rem;
}

.function-page-header__session-status {
	max-width: 100%;
}

@media (max-width: 599px) {
	.function-page-header__context-item + .function-page-header__context-item {
		border-left: 0;
		padding-left: 0;
	}

	.function-page-header__session-status {
		margin-top: 0.75rem;
	}
}
</style>
