<template>
	<DashboardPage>
		<DashboardPageHeader
			title="Users"
			:subtitle="`${users.length} user${users.length === 1 ? '' : 's'}`"
		>
			<template #actions>
				<DialogTrigger
					unelevated
					color="primary"
					icon="sym_r_person_add"
					label="Invite user"
				>
					<InviteUserForm />
				</DialogTrigger>
			</template>
		</DashboardPageHeader>
		<DashboardPageContent>
			<div class="row items-center q-gutter-sm">
				<TableSearch
					:model-value="search"
					@update:model-value="search = $event ?? ''"
				/>
				<TableFilter
					v-model="statuses"
					label="Status"
					:options="statusOptions"
				/>
				<TableFilter
					v-model="enabled"
					label="Access"
					:options="accessOptions"
				/>
				<TableClearFilters
					:filters="{
						text: search,
						facets: { status: statuses, access: enabled }
					}"
					@clear-facets="clearFacets"
				/>
			</div>
			<q-banner
				v-if="usersQuery.isError.value"
				class="bg-negative text-white"
			>
				Could not load users.
				<template #action
					><q-btn flat label="Retry" @click="usersQuery.refetch()"
				/></template>
			</q-banner>
			<BaseTable
				v-else
				:rows="filteredUsers"
				:columns="columns"
				:loading="
					usersQuery.isPending.value ||
					usersQuery.isFetchingNextPage.value
				"
				:rows-per-page-options="[0]"
				:grid="$q.screen.lt.sm"
				:row-class="rowClass"
				hide-pagination
				row-key="id"
				:empty-message="
					users.length
						? 'No users match your filters'
						: 'No users found'
				"
			>
				<template #body-cell-status="props">
					<q-td :props="props">{{
						statusLabel(props.row.cognitoStatus)
					}}</q-td>
				</template>
				<template #body-cell-createdAt="props">
					<q-td :props="props">{{
						formatDate(props.row.createdAt)
					}}</q-td>
				</template>
				<template #body-cell-actions="props">
					<q-td :props="props"
						><UserActions :user="props.row"
					/></q-td>
				</template>
				<template #item="props">
					<div class="col-12 q-pb-sm" :class="rowClass(props.row)">
						<q-card flat bordered
							><q-card-section>
								<div
									class="row items-center justify-between no-wrap"
								>
									<div class="text-weight-medium">{{
										props.row.email
									}}</div>
									<UserActions :user="props.row" />
								</div>
								<div class="text-secondary"
									>{{
										statusLabel(props.row.cognitoStatus)
									}}
									· {{ formatDate(props.row.createdAt) }}</div
								>
							</q-card-section></q-card
						>
					</div>
				</template>
			</BaseTable>
		</DashboardPageContent>
	</DashboardPage>
</template>

<script setup lang="ts">
import type { User } from "@sst-console/sdk";
import { computed, ref } from "vue";
import UserActions from "@/components/Users/UserActions.vue";
import InviteUserForm from "@/components/Users/InviteUserForm.vue";
import { DialogTrigger } from "@/components/ui/Dialog";
import {
	DashboardPage,
	DashboardPageContent,
	DashboardPageHeader
} from "@/components/ui/Dashboard";
import {
	BaseTable,
	TableClearFilters,
	TableFilter,
	TableSearch,
	type ExtendedQTableColumn
} from "@/components/ui/Table";
import { useUsers } from "@/composables/users";

const usersQuery = useUsers();
const users = computed(
	() => usersQuery.data.value?.pages.flatMap(page => page.items) ?? []
);
const search = ref("");
const statuses = ref<string[]>([]);
const enabled = ref<string[]>([]);
function clearFacets() {
	statuses.value = [];
	enabled.value = [];
}
const columns: ExtendedQTableColumn[] = [
	{
		name: "email",
		label: "Email",
		field: "email",
		align: "left",
		sortable: true
	},
	{
		name: "status",
		label: "Status",
		field: "cognitoStatus",
		align: "left",
		sortable: true
	},
	{
		name: "createdAt",
		label: "Added",
		field: "createdAt",
		align: "left",
		sortable: true
	},
	{ name: "actions", label: "", field: "id", align: "right" }
];
const accessOptions = [
	{ label: "Enabled", value: "enabled" },
	{ label: "Disabled", value: "disabled" }
];
function statusLabel(status: string) {
	if (status === "CONFIRMED") return "Confirmed";
	if (status === "FORCE_CHANGE_PASSWORD") return "Password change required";
	return status.replaceAll("_", " ");
}
const statusOptions = computed(() =>
	[...new Set(users.value.map(user => user.cognitoStatus))].map(value => ({
		value,
		label: statusLabel(value)
	}))
);
const filteredUsers = computed(() =>
	users.value.filter(
		user =>
			user.email
				.toLowerCase()
				.includes(search.value.trim().toLowerCase()) &&
			(!statuses.value.length ||
				statuses.value.includes(user.cognitoStatus)) &&
			(!enabled.value.length ||
				enabled.value.includes(
					user.cognitoEnabled ? "enabled" : "disabled"
				))
	)
);
function rowClass(user: User) {
	return user.cognitoEnabled ? "" : "text-muted";
}
function formatDate(value: string) {
	return new Date(value).toLocaleDateString();
}
</script>
