<template>
	<DashboardPage>
		<DashboardPageBreadcrumbs :segments="breadcrumbs" class="q-mb-md" />
		<DashboardPageHeader
			:title="`Account ${accountId}`"
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
import { Dialog } from "quasar";
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
import { DialogConfirm } from "@/components/ui/Dialog";
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
	() => account.data.value?.lastSyncConflicts ?? []
);
const accountSubtitle = computed(() => {
	const value = account.data.value;
	return value ? `${value.region} · ${value.status}` : "Loading account";
});
const breadcrumbs = computed(() => [
	{ label: "Accounts", to: { name: "accounts" } },
	{ label: `Account ${accountId.value}` }
]);

async function refresh() {
	try {
		await refreshDiscovery.mutateAsync(accountId.value);
		successNotify("SST app discovery refreshed");
	} catch {
		errorNotify("Unable to refresh SST app discovery");
	}
}

function apply() {
	if (!policy.value) return;
	const account = accountId.value;
	const selectedPolicy = policy.value;
	Dialog.create({
		component: DialogConfirm,
		componentProps: {
			title: "Apply policy and sync",
			subtitle: `Account ${account}`,
			message:
				"This saves the sync policy and updates discovered Apps and Stages. It can remove entities no longer present in this account or excluded by the policy.",
			icon: "sym_r_sync",
			variant: "primary",
			confirmLabel: "Apply and sync",
			perform: async () => {
				await applyPolicy.mutateAsync({
					accountId: account,
					policy: selectedPolicy
				});
				successNotify("Sync policy applied and account synced");
			}
		}
	});
}
</script>
