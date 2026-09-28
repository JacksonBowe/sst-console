<template>
	<BaseTable
		:rows="accounts"
		:columns="columns"
		:rows-per-page-options="[12, 24, 48]"
		:loading="loading"
		:row-class="() => 'cursor-pointer'"
		@row-click="openAccount"
	>
		<template #top>
			<div class="q-pa-md text-subtitle1 text-weight-medium">
				Accounts
			</div>
		</template>

		<template #no-data>
			<div
				v-if="!loading"
				class="column items-center text-center q-pa-xl q-gutter-sm"
			>
				<q-icon
					name="sym_r_account_balance"
					size="40px"
					color="secondary"
				/>
				<div class="text-h6">No accounts connected</div>
				<div class="text-body2 text-secondary">
					Connect an AWS account, then sync it to discover SST Apps
					and Stages.
				</div>
				<ConnectAccountTrigger>
					<template #trigger="{ open }">
						<q-btn
							unelevated
							no-caps
							color="primary"
							label="Connect account"
							@click="open"
						/>
					</template>
				</ConnectAccountTrigger>
			</div>
		</template>

		<template #body-cell-accountId="tableProps">
			<q-td :props="tableProps">
				<div class="accounts-table__account-id">
					<router-link
						class="accounts-table__link text-mono"
						:to="accountRoute(tableProps.row.accountId)"
					>
						{{ tableProps.row.accountId }}
					</router-link>
					<CopyValue
						copy-only
						:value="tableProps.row.accountId"
						label="account ID"
					/>
				</div>
			</q-td>
		</template>

		<template #body-cell-status="tableProps">
			<q-td :props="tableProps">
				<AccountConnectionStatus :status="tableProps.row.status" />
			</q-td>
		</template>

		<template #body-cell-roleArn="tableProps">
			<q-td :props="tableProps">
				<span
					class="accounts-table__role text-mono"
					:title="tableProps.row.roleArn"
				>
					{{ tableProps.row.roleArn }}
				</span>
			</q-td>
		</template>

		<template #body-cell-actions="tableProps">
			<q-td :props="tableProps" class="text-right">
				<q-btn
					flat
					dense
					no-caps
					color="primary"
					label="Sync"
					:disable="tableProps.row.status !== 'connected'"
					:title="
						tableProps.row.status === 'disconnected'
							? 'Reconnect this account before syncing.'
							: undefined
					"
					@click.stop="$emit('sync', tableProps.row)"
				/>
			</q-td>
		</template>
	</BaseTable>
</template>

<script setup lang="ts">
import type { Account } from "@sst-console/sdk";
import { useRouter } from "vue-router";

import { CopyValue } from "@/components/ui/Identifier";
import { BaseTable, type ExtendedQTableColumn } from "@/components/ui/Table";

import AccountConnectionStatus from "./AccountConnectionStatus.vue";
import ConnectAccountTrigger from "./ConnectAccountTrigger.vue";

const props = withDefaults(
	defineProps<{
		accounts: Account[];
		loading?: boolean;
	}>(),
	{ loading: false }
);

defineEmits<{ sync: [account: Account] }>();

const router = useRouter();

const columns: ExtendedQTableColumn[] = [
	{
		name: "accountId",
		label: "Account ID",
		field: "accountId",
		align: "left",
		sortable: true
	},
	{
		name: "region",
		label: "Region",
		field: "region",
		align: "left",
		sortable: true
	},
	{
		name: "status",
		label: "Connection",
		field: "status",
		align: "left",
		sortable: true
	},
	{
		name: "roleArn",
		label: "Role identity",
		field: "roleArn",
		align: "left"
	},
	{
		name: "actions",
		label: "Actions",
		field: () => "",
		align: "right"
	}
];

function accountRoute(accountId: string) {
	return { name: "account-detail", params: { accountId } };
}

function openAccount(event: Event, account: Account) {
	if (
		event.target instanceof Element &&
		event.target.closest("a, button, input, [role='button']")
	)
		return;
	void router.push(accountRoute(account.accountId));
}
</script>

<style scoped lang="scss">
.accounts-table__account-id {
	display: flex;
	align-items: center;
	gap: 0.25rem;
	min-width: 0;
}

.accounts-table__link {
	color: var(--q-primary);
	text-decoration: none;
}

.accounts-table__link:hover {
	text-decoration: underline;
}

.accounts-table__role {
	display: block;
	max-width: 24rem;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

@media (max-width: 599px) {
	.accounts-table__role {
		max-width: 12rem;
	}
}
</style>
