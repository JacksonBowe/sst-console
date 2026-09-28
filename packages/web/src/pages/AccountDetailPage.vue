<template>
	<DashboardPage>
		<DashboardPageBreadcrumbs :segments="breadcrumbs" class="q-mb-md" />
		<DashboardPageHeader
			:title="`Workload ${accountId}`"
			:subtitle="accountSubtitle"
		>
			<template #actions>
				<AccountDetailActions
					:refreshing="refreshDiscovery.isPending.value"
					:applying="applyPolicy.isPending.value"
					:can-apply="Boolean(policy)"
					@refresh="refresh"
					@apply="apply"
				/>
			</template>
		</DashboardPageHeader>

		<AccountSyncConflictBanner :conflicts="conflicts" />
		<AccountAppsManager
			:stages="manageQuery.data.value?.stages ?? []"
			:policy="policy"
			:loading="manageQuery.isPending.value"
			:error="manageQuery.isError.value"
			@update:policy="policy = $event"
		/>
	</DashboardPage>
</template>

<script setup lang="ts">
import type { AccountSyncPolicy, StageAccountConflict } from "@sst-console/sdk";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";

import {
	AccountAppsManager,
	AccountDetailActions,
	AccountSyncConflictBanner
} from "@/components/Accounts";
import {
	DashboardPage,
	DashboardPageBreadcrumbs,
	DashboardPageHeader
} from "@/components/ui/Dashboard";
import { errorNotify, successNotify } from "@/components/ui/toast";
import {
	useAccount,
	useApplyAccountSyncPolicy,
	useManageAccountApps,
	useRefreshAccountDiscovery
} from "@/composables/accounts";

const route = useRoute();
const accountId = computed(() => String(route.params.accountId ?? ""));
const account = useAccount(accountId.value);
const manageQuery = useManageAccountApps(accountId.value);
const refreshDiscovery = useRefreshAccountDiscovery();
const applyPolicy = useApplyAccountSyncPolicy();
const policy = ref<AccountSyncPolicy | null>(null);

watch(
	() => manageQuery.data.value?.policy,
	value => {
		if (!value) return;
		policy.value = {
			allowList: value.allowList.map(selector => ({ ...selector })),
			ignoreList: value.ignoreList.map(selector => ({ ...selector }))
		};
	},
	{ immediate: true }
);

const conflicts = computed<StageAccountConflict[]>(
	() => account.data.value?.account.lastSyncConflicts ?? []
);
const accountSubtitle = computed(() => {
	const value = account.data.value?.account;
	return value ? `${value.region} · ${value.status}` : "Loading Workload";
});
const breadcrumbs = computed(() => [
	{ label: "Accounts", to: { name: "accounts" } },
	{ label: `Workload ${accountId.value}` }
]);

async function refresh() {
	try {
		await refreshDiscovery.mutateAsync(accountId.value);
		successNotify("SST app discovery refreshed");
	} catch {
		errorNotify("Unable to refresh SST app discovery");
	}
}

async function apply() {
	if (!policy.value) return;
	try {
		await applyPolicy.mutateAsync({
			accountId: accountId.value,
			policy: policy.value
		});
		successNotify("Sync policy applied and Workload synced");
	} catch {
		errorNotify("Unable to apply sync policy");
	}
}
</script>
