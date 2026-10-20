<template>
	<DashboardPage>
		<DashboardPageHeader title="Apps" :subtitle="subtitle">
			<template #actions>
				<ConnectAccountTrigger />
			</template>
		</DashboardPageHeader>

		<DashboardPageContent>
			<TableToolbar v-if="apps.length">
				<template #search>
					<TableSearch v-model="search" />
				</template>
				<template #filters>
					<TableFilter
						v-model="accountIds"
						label="Account"
						:options="accountOptions"
						searchable
					/>
				</template>
			</TableToolbar>
			<AppsListErrorState
				v-if="appsQuery.isError.value"
				@retry="appsQuery.refetch()"
			/>
			<AppsListNotFoundState
				v-else-if="!appsQuery.isPending.value && !apps.length"
			/>

			<AppsList
				v-else
				:apps="filteredApps"
				:loading="appsQuery.isPending.value"
				:open-issues="openIssues"
			/>
		</DashboardPageContent>
	</DashboardPage>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

import { ConnectAccountTrigger } from "@/components/Accounts";
import {
	AppsList,
	AppsListErrorState,
	AppsListNotFoundState
} from "@/components/App";
import {
	DashboardPage,
	DashboardPageContent,
	DashboardPageHeader
} from "@/components/ui/Dashboard";
import { TableFilter, TableSearch, TableToolbar } from "@/components/ui/Table";
import { useApps } from "@/composables/apps";
import { useIssues } from "@/composables/issues";

const appsQuery = useApps();
const issuesQuery = useIssues({ status: "open" });
const apps = computed(() => appsQuery.data.value ?? []);
const openIssues = computed(() => issuesQuery.data.value ?? []);
const search = ref("");
const accountIds = ref<string[]>([]);
const accountOptions = computed(() =>
	[
		...new Set(
			apps.value.flatMap(app => app.stages.map(stage => stage.accountId))
		)
	]
		.sort()
		.map(value => ({ label: value, value }))
);
const filteredApps = computed(() => {
	const query = search.value.trim().toLowerCase();
	return apps.value.filter(app => {
		const matchesSearch =
			!query || app.appName.toLowerCase().includes(query);
		const matchesAccount =
			!accountIds.value.length ||
			app.stages.some(stage =>
				accountIds.value.includes(stage.accountId)
			);
		return matchesSearch && matchesAccount;
	});
});

const accountCount = computed(
	() =>
		new Set(
			apps.value.flatMap(app => app.stages.map(stage => stage.accountId))
		).size
);

const subtitle = computed(() => {
	const appLabel = apps.value.length === 1 ? "application" : "applications";
	const accountLabel =
		accountCount.value === 1 ? "AWS account" : "AWS accounts";

	return `${apps.value.length} ${appLabel} across ${accountCount.value} ${accountLabel}`;
});
</script>
