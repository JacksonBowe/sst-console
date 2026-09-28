<template>
	<q-banner
		v-if="conflicts.length"
		class="bg-warning text-dark rounded-borders q-mb-lg"
	>
		<template #avatar><q-icon name="sym_r_warning" /></template>
		<div class="text-weight-medium">Some SST stages were skipped</div>
		<div>
			Ignore stale stage on this Workload, apply sync, then sync intended
			Workload.
		</div>
		<ul class="q-mb-none q-mt-sm q-pl-md">
			<li v-for="conflict in conflicts" :key="conflictKey(conflict)">
				{{ conflict.appName }}/{{ conflict.stageName }} belongs to
				Workload
				{{ conflict.ownerAccountId }}
			</li>
		</ul>
	</q-banner>
</template>

<script setup lang="ts">
import type { StageAccountConflict } from "@sst-console/sdk";

defineProps<{
	conflicts: StageAccountConflict[];
}>();

function conflictKey(conflict: StageAccountConflict) {
	return `${conflict.appName}\u0000${conflict.stageName}`;
}
</script>
