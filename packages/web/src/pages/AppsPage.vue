<template>
	<DashboardPage>
		<DashboardPageHeader title="Apps" :subtitle="subtitle">
			<template #actions>
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
			<q-card
				v-if="appsQuery.isError.value"
				flat
				bordered
				class="q-pa-xl"
			>
				<div class="column items-center text-center q-gutter-sm">
					<q-icon name="sym_r_error" size="40px" color="negative" />
					<div class="text-h6">Unable to load Apps</div>
					<div class="text-body2 text-secondary">
						Check your connection, then try again.
					</div>
					<q-btn
						unelevated
						no-caps
						color="primary"
						label="Retry"
						@click="appsQuery.refetch()"
					/>
				</div>
			</q-card>

			<q-card
				v-else-if="!appsQuery.isPending.value && !apps.length"
				flat
				bordered
				class="q-pa-xl"
			>
				<div class="column items-center text-center q-gutter-sm">
					<q-icon
						name="sym_r_deployed_code"
						size="40px"
						color="secondary"
					/>
					<div class="text-h6">No Apps discovered</div>
					<div class="text-body2 text-secondary">
						Connect and sync an AWS account to discover SST Apps and
						Stages.
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
			</q-card>

			<AppsList
				v-else
				:apps="apps"
				:loading="appsQuery.isPending.value"
			/>
		</DashboardPageContent>
	</DashboardPage>
</template>

<script setup lang="ts">
import { computed } from "vue";

import { AppsList } from "@/components/ui/App";
import { ConnectAccountTrigger } from "@/components/ui/Accounts";
import {
	DashboardPage,
	DashboardPageContent,
	DashboardPageHeader
} from "@/components/ui/Dashboard";
import { useApps } from "@/composables/apps";

const appsQuery = useApps();
const apps = computed(() => appsQuery.data.value ?? []);

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
