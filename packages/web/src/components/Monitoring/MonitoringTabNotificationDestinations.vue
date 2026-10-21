<template>
	<DashboardPageContent>
		<div class="text-body2 text-secondary">
			Notification destinations are reusable destinations for issue
			notifications.
		</div>
		<NotificationDestinationsTable
			:targets="targetsQuery.data.value ?? []"
			:alerts="alertsQuery.data.value ?? []"
			:loading="targetsQuery.isPending.value"
		/>
	</DashboardPageContent>
</template>

<script setup lang="ts">
import { NotificationDestinationsTable } from "@/components/AlertRules";
import { DashboardPageContent } from "@/components/ui/Dashboard";
import { useAlertRules } from "@/composables/alert-rules";
import { useNotificationDestinations } from "@/composables/notification-destinations";

const alertsQuery = useAlertRules();
const targetsQuery = useNotificationDestinations();
</script>
