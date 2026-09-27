<template>
	<DashboardPage>
		<DashboardPageHeader :title="`Workload ${accountId}`" back="Accounts" />

		<q-banner
			v-if="conflicts.length"
			class="bg-warning text-dark rounded-borders"
			inline-actions
		>
			<template #avatar>
				<q-icon name="sym_r_warning" />
			</template>
			<div class="text-weight-medium">Some SST stages were skipped</div>
			<div>
				These state entries belong to another Workload account. Remove
				stale deployments from this Workload before syncing them here.
			</div>
			<ul class="q-mb-none q-mt-sm q-pl-md">
				<li v-for="conflict in conflicts" :key="conflictKey(conflict)">
					{{ conflict.appName }}/{{ conflict.stageName }} belongs to
					Workload
					{{ conflict.ownerAccountId }}
				</li>
			</ul>
		</q-banner>
	</DashboardPage>
</template>

<script setup lang="ts">
import type { StageAccountConflict } from "@sst-console/sdk";
import { computed } from "vue";
import { useRoute } from "vue-router";

import { DashboardPage, DashboardPageHeader } from "@/components/ui/Dashboard";
import { useAccount } from "@/composables/accounts";

const route = useRoute();
const accountId = computed(() => String(route.params.accountId ?? ""));
const account = useAccount(accountId.value);
const conflicts = computed<StageAccountConflict[]>(
	() => account.data.value?.account.lastSyncConflicts ?? []
);

function conflictKey(conflict: StageAccountConflict): string {
	return `${conflict.appName}\u0000${conflict.stageName}`;
}
</script>
