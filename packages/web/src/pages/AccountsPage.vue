<template>
	<DashboardPage>
		<DashboardPageHeader title="Accounts" :subtitle="subtitle">
			<template #actions>
				<q-btn
					outline
					no-caps
					color="primary"
					icon="sym_r_sync"
					label="Sync all"
					:disable="connectedAccountCount === 0 || isSyncAllOpen"
					@click="confirmSyncAll"
				/>
				<ConnectAccountTrigger>
					<template #trigger="{ open }">
						<q-btn
							unelevated
							no-caps
							color="primary"
							icon="sym_r_add"
							label="Connect account"
							@click="open"
						/>
					</template>
				</ConnectAccountTrigger>
			</template>
		</DashboardPageHeader>

		<DashboardPageContent>
			<AccountsListErrorState
				v-if="accountsQuery.isError.value"
				@retry="accountsQuery.refetch()"
			/>
			<AccountsTable
				v-else
				:accounts="accounts"
				:loading="accountsQuery.isPending.value"
				@sync="confirmSync"
			/>
		</DashboardPageContent>
	</DashboardPage>
</template>

<script setup lang="ts">
import type { Account } from "@sst-console/sdk";
import { Dialog } from "quasar";
import { computed, ref } from "vue";

import {
	AccountsListErrorState,
	AccountsTable,
	SyncAllAccountsDialog
} from "@/components/Accounts";
import {
	DashboardPage,
	DashboardPageContent,
	DashboardPageHeader
} from "@/components/ui/Dashboard";
import { DialogConfirm } from "@/components/ui/Dialog";
import { useAccounts, useSyncAccount } from "@/composables/accounts";

const accountsQuery = useAccounts();
const syncAccount = useSyncAccount();
const isSyncAllOpen = ref(false);

const accounts = computed(() => accountsQuery.data.value ?? []);
const connectedAccountCount = computed(
	() =>
		accounts.value.filter(account => account.status === "connected").length
);
const subtitle = computed(() => {
	const count = connectedAccountCount.value;
	return `${count} connected AWS ${count === 1 ? "account" : "accounts"}`;
});

function confirmSync(account: Account): void {
	Dialog.create({
		component: DialogConfirm,
		componentProps: {
			title: "Sync account",
			target: account.accountId,
			message:
				"Sync updates discovered Apps and Stages. It can remove entities no longer present in this account.",
			icon: "sym_r_sync",
			variant: "primary",
			destructive: false,
			confirmLabel: "Sync account",
			perform: () => syncAccount.mutateAsync(account.accountId)
		}
	});
}

function confirmSyncAll(): void {
	const accountIds = accounts.value
		.filter(account => account.status === "connected")
		.map(account => account.accountId);
	if (accountIds.length === 0) return;

	isSyncAllOpen.value = true;
	Dialog.create({
		component: SyncAllAccountsDialog,
		componentProps: { accountIds }
	}).onDismiss(() => {
		isSyncAllOpen.value = false;
	});
}
</script>
