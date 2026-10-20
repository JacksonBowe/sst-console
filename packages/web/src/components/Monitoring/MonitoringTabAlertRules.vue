<template>
	<DashboardPageContent>
		<div class="text-body2 text-secondary">
			Rules determine which issues trigger notifications and which
			notification destinations receive them.
		</div>
		<AlertRulesTable
			:alerts="alertsQuery.data.value ?? []"
			:targets="targetsQuery.data.value ?? []"
			:loading="alertsQuery.isPending.value"
		/>
	</DashboardPageContent>
</template>

<script setup lang="ts">
import { AlertRulesTable } from "@/components/AlertRules";
import { DashboardPageContent } from "@/components/ui/Dashboard";
import { useAlertRules } from "@/composables/alert-rules";
import { useNotificationDestinations } from "@/composables/notification-destinations";

const alertsQuery = useAlertRules();
const targetsQuery = useNotificationDestinations();
</script>
