<template>
	<div class="col-12 q-pb-sm">
		<q-card flat bordered class="stage-card cursor-pointer">
			<q-card-section class="q-pa-md">
				<router-link
					class="stage-link text-subtitle1 text-weight-medium"
					:to="{
						name: 'stage-detail',
						params: { appName, stageName: stage.stageName }
					}"
				>
					{{ stage.stageName }}
				</router-link>
				<div class="row q-col-gutter-md q-mt-xs">
					<div class="col-6">
						<div class="text-caption text-secondary">Account</div>
						<router-link
							class="stage-link text-mono"
							:to="{
								name: 'account-detail',
								params: { accountId: stage.accountId }
							}"
						>
							{{ stage.accountId }}
						</router-link>
					</div>
					<div class="col-6">
						<div class="text-caption text-secondary">Region</div>
						<div>{{ stage.region }}</div>
					</div>
					<div class="col-6">
						<div class="text-caption text-secondary">Resources</div>
						<div>{{ stage.resourceCount }}</div>
					</div>
					<div class="col-6">
						<div class="text-caption text-secondary"
							>State observed</div
						>
						<span v-if="stage.state" :title="stage.state.sourceKey">
							{{ formatTimestamp(stage.state.observedAt) }}
						</span>
						<span v-else class="text-secondary">No state</span>
					</div>
					<div class="col-12">
						<div class="text-caption text-secondary">Updated</div>
						<div :title="stage.updatedAt">
							{{ formatTimestamp(stage.updatedAt) }}
						</div>
					</div>
				</div>
			</q-card-section>
			<q-separator />
			<q-card-section
				class="q-pa-md row items-center justify-between q-gutter-sm"
			>
				<div>
					<div class="text-caption text-secondary"
						>Issue monitoring</div
					>
					<q-badge
						:color="
							stage.issueMonitoringEnabled ? 'positive' : 'grey'
						"
						:label="
							stage.issueMonitoringEnabled
								? 'Enabled'
								: 'Disabled'
						"
					/>
				</div>
				<q-btn
					flat
					dense
					no-caps
					:color="
						stage.issueMonitoringEnabled ? 'negative' : 'primary'
					"
					:label="
						stage.issueMonitoringEnabled
							? 'Disable monitoring'
							: 'Enable monitoring'
					"
					:loading="updatingStageName === stage.stageName"
					:disable="Boolean(updatingStageName)"
					@click.stop="
						$emit('monitoring', !stage.issueMonitoringEnabled)
					"
				/>
			</q-card-section>
		</q-card>
	</div>
</template>

<script setup lang="ts">
import type { AppStage } from "@sst-console/sdk";

import { formatDateTime } from "@/components/ui/format";

defineProps<{
	appName: string;
	stage: AppStage;
	updatingStageName?: string | undefined;
}>();

defineEmits<{ monitoring: [enabled: boolean] }>();

function formatTimestamp(value: string | null | undefined) {
	if (!value || Number.isNaN(new Date(value).getTime())) return "Unavailable";
	return formatDateTime(value);
}
</script>

<style scoped>
.stage-card {
	overflow-wrap: anywhere;
}

.stage-link {
	color: var(--q-primary);
	text-decoration: none;
}

.stage-link:hover {
	text-decoration: underline;
}
</style>
