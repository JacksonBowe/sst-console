<template>
	<DashboardPage>
		<DashboardPageHeader
			title="Alerts"
			subtitle="Route Console events to alert targets"
		>
			<template #actions>
				<AlertTrigger>
					<template #trigger="{ open }">
						<q-btn
							unelevated
							no-caps
							color="primary"
							label="Create alert"
							@click="open"
						/>
					</template>
				</AlertTrigger>
			</template>
		</DashboardPageHeader>
		<DashboardPageContent>
			<AlertsTable
				:alerts="alertsQuery.data.value ?? []"
				:targets="targetsQuery.data.value ?? []"
				:loading="alertsQuery.isPending.value"
				@remove="remove"
			/>

			<div class="row items-center justify-between q-mt-xl q-mb-sm">
				<div class="text-h6">Alert targets</div>
				<AlertTargetTrigger>
					<template #trigger="{ open }">
						<q-btn
							unelevated
							no-caps
							color="primary"
							label="Create target"
							@click="open"
						/>
					</template>
				</AlertTargetTrigger>
			</div>
			<AlertTargetsTable
				:targets="targetsQuery.data.value ?? []"
				:loading="targetsQuery.isPending.value"
				:testing-target-id="testingTargetId"
				@test="testTarget"
				@remove="removeTarget"
			/>
		</DashboardPageContent>
	</DashboardPage>
</template>

<script setup lang="ts">
import type { Alert, AlertTarget } from "@sst-console/sdk";
import { Dialog, Notify } from "quasar";
import { ref } from "vue";

import { api, handleApiError } from "@/boot/api-client";
import { useAlertTargets } from "@/composables/alert-targets";
import { useAlerts } from "@/composables/alerts";
import {
	AlertTargetTrigger,
	AlertTargetsTable,
	AlertTrigger,
	AlertsTable
} from "@/components/Alerts";
import {
	DashboardPage,
	DashboardPageContent,
	DashboardPageHeader
} from "@/components/ui/Dashboard";
import { DialogConfirm } from "@/components/ui/Dialog";

const alertsQuery = useAlerts();
const targetsQuery = useAlertTargets();
const testingTargetId = ref<string>();

function sourceLabel(alert: Alert) {
	if (!alert.appName) return "All apps · All stages";
	return `${alert.appName} · ${alert.stageName ?? "All stages"}`;
}

function remove(alert: Alert) {
	Dialog.create({
		component: DialogConfirm,
		componentProps: {
			title: "Delete alert",
			message: `Delete alert for ${sourceLabel(alert)}?`,
			variant: "negative",
			confirmLabel: "Delete",
			perform: async () => {
				await api.removeAlert(alert.id);
				await alertsQuery.refetch();
			}
		}
	});
}

function removeTarget(target: AlertTarget) {
	Dialog.create({
		component: DialogConfirm,
		componentProps: {
			title: "Delete alert target",
			message: `Delete ${target.name}? Remove it from every Alert first.`,
			variant: "negative",
			confirmLabel: "Delete",
			perform: async () => {
				await api.removeAlertTarget(target.id);
				await targetsQuery.refetch();
			}
		}
	});
}

async function testTarget(target: AlertTarget) {
	testingTargetId.value = target.id;
	try {
		await api.testAlertTarget(target.id);
		Notify.create({
			message: `Test alert sent to ${target.name}`,
			color: "positive"
		});
	} catch (error) {
		handleApiError(error);
	} finally {
		testingTargetId.value = undefined;
	}
}
</script>
