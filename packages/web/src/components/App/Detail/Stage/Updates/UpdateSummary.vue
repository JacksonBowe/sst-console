<template>
	<div>
		<div class="row items-center justify-between q-gutter-sm">
			<div class="row items-center q-gutter-x-sm">
				<q-icon
					:name="statusIcon(update, isNewest)"
					:color="statusColor(update, isNewest)"
					size="22px"
					role="img"
					:aria-label="status(update, isNewest)"
				>
					<q-tooltip>{{ status(update, isNewest) }}</q-tooltip>
				</q-icon>
				<div class="text-h6 text-mono">{{
					update.command || "Command unavailable"
				}}</div>
			</div>
			<q-btn
				flat
				round
				dense
				icon="sym_r_info"
				color="secondary"
				aria-label="Processing details"
			>
				<q-tooltip>Processing details</q-tooltip>
				<q-menu anchor="bottom right" self="top right" :offset="[0, 8]">
					<div class="q-pa-md text-body2">
						<div class="text-subtitle2 q-mb-sm"
							>Processing details</div
						>
						<div>Update: {{ artifactStatus(update) }}</div>
						<template v-if="detail">
							<div
								>Snapshot:
								{{ artifactStatus(detail.snapshot) }}</div
							>
							<div
								>Event log:
								{{ artifactStatus(detail.eventLog) }}</div
							>
						</template>
					</div>
				</q-menu>
			</q-btn>
		</div>
		<div class="update-summary__facts q-mt-md">
			<div
				><div class="text-caption text-secondary">Started</div
				><div>{{ timestamp(update.timeStarted) }}</div></div
			>
			<div
				><div class="text-caption text-secondary">Duration</div
				><div>{{
					duration(update.timeStarted, update.timeCompleted)
				}}</div></div
			>
			<div
				><div class="text-caption text-secondary">Changes</div
				><UpdateChangeCounts :counts="update.resourceCounts"
			/></div>
		</div>
		<div
			v-if="update.comparisonStatus === 'unavailable'"
			class="text-warning q-mt-sm"
			>Snapshot comparison unavailable.</div
		>
	</div>
</template>

<script setup lang="ts">
import type {
	StateArtifact,
	StateUpdate,
	StateUpdateDetail
} from "@sst-console/sdk";
import UpdateChangeCounts from "./UpdateChangeCounts.vue";
import { duration, status, statusColor, timestamp } from "./update-format";

defineProps<{
	update: StateUpdate;
	isNewest: boolean;
	detail?: StateUpdateDetail | undefined;
}>();

function artifactStatus(artifact?: StateArtifact | null) {
	return !artifact
		? "Not discovered"
		: artifact.processedAt
			? "Processed"
			: "Unprocessed";
}

function statusIcon(update: StateUpdate, isNewest: boolean) {
	switch (status(update, isNewest)) {
		case "Succeeded":
			return "sym_r_check_circle";
		case "Failed":
			return "sym_r_error";
		case "Possibly in progress":
			return "sym_r_schedule";
		case "Unprocessed":
			return "sym_r_pending";
		default:
			return "sym_r_help";
	}
}
</script>

<style scoped>
.update-summary__facts {
	display: flex;
	flex-wrap: wrap;
	gap: 0.75rem 2rem;
}
</style>
