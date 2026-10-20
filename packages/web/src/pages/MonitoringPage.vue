<template>
	<DashboardPage>
		<DashboardPageHeader
			title="Monitoring"
			subtitle="Investigate workload failures and configure notifications"
		>
			<template #actions>
				<MonitoringActions :tab="activeTab" />
			</template>
		</DashboardPageHeader>

		<q-tabs
			v-model="activeTab"
			dense
			no-caps
			align="left"
			active-color="primary"
			indicator-color="primary"
			class="monitoring-page__tabs"
		>
			<q-tab name="issues" label="Issues" />
			<q-tab name="rules" label="Alert rules" />
			<q-tab name="channels" label="Notification destinations" />
		</q-tabs>

		<MonitoringTabIssues v-show="activeTab === 'issues'" />
		<MonitoringTabAlertRules v-show="activeTab === 'rules'" />
		<MonitoringTabNotificationDestinations
			v-show="activeTab === 'channels'"
		/>
	</DashboardPage>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { DashboardPage, DashboardPageHeader } from "@/components/ui/Dashboard";
import {
	MonitoringActions,
	MonitoringTabAlertRules,
	MonitoringTabIssues,
	MonitoringTabNotificationDestinations
} from "@/components/Monitoring";

type Tab = "issues" | "rules" | "channels";

const route = useRoute();
const router = useRouter();
const activeTab = ref<Tab>(tabFromQuery(route.query.tab));

watch(
	activeTab,
	tab =>
		void router.replace({
			query: { ...route.query, tab: tab === "issues" ? undefined : tab }
		})
);

function tabFromQuery(value: unknown): Tab {
	return value === "rules" || value === "channels" ? value : "issues";
}
</script>

<style scoped lang="scss">
.monitoring-page__tabs {
	border-bottom: 1px solid var(--q-border);
	margin-bottom: 1rem;
}
</style>
