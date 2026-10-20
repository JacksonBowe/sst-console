<template>
	<q-card class="q-dialog-plugin">
		<q-form @submit.prevent="save">
			<q-card-section>
				<div class="text-h6">
					{{ alert ? "Edit alert rule" : "Create alert rule" }}
				</div>
			</q-card-section>
			<q-card-section class="q-gutter-md">
				<SSelect
					v-model="form.type"
					label="Type"
					:options="['issue']"
					disable
				/>
				<SSelect
					v-model="form.appName"
					label="App"
					:options="appOptions"
					option-label="label"
					option-value="value"
					emit-value
					map-options
					@update:model-value="selectApp"
				/>
				<SSelect
					v-model="form.stageName"
					label="Stage"
					:disable="!form.appName"
					:options="stageOptions"
					option-label="label"
					option-value="value"
					emit-value
					map-options
				/>
				<SSelect
					v-model="form.notificationDestinationIds"
					label="Notification destinations"
					:options="targetOptions"
					option-label="label"
					option-value="value"
					emit-value
					map-options
					multiple
					use-chips
					:rules="rules.arrayMinLength(1)"
				/>
				<div
					v-if="!targetOptions.length"
					class="text-caption text-warning"
				>
					Add a notification channel before creating an alert rule.
				</div>
			</q-card-section>
			<q-card-actions align="right">
				<q-btn
					flat
					no-caps
					label="Cancel"
					:disable="saving"
					v-close-popup
				/>
				<q-btn
					unelevated
					no-caps
					color="primary"
					label="Save"
					type="submit"
					:loading="saving"
					:disable="
						!dirty ||
						saving ||
						!form.notificationDestinationIds.length
					"
				/>
			</q-card-actions>
		</q-form>
	</q-card>
</template>

<script setup lang="ts">
import type { AlertRule, AlertRuleInput } from "@sst-console/sdk";
import { computed, ref } from "vue";

import { useNotificationDestinations } from "@/composables/notification-destinations";
import {
	useCreateAlertRule,
	useUpdateAlertRule
} from "@/composables/alert-rules";
import { useApps } from "@/composables/apps";
import { rules, useForm } from "@/components/ui/form";
import { SSelect } from "@/components/ui/Select";

type AlertRuleFormState = Omit<AlertRuleInput, "appName" | "stageName"> & {
	appName: string | null;
	stageName: string | null;
};

const props = defineProps<{ alert?: AlertRule }>();
const emit = defineEmits<{ success: [] }>();
const targetsQuery = useNotificationDestinations();
const appsQuery = useApps();
const createAlertRuleMutation = useCreateAlertRule();
const updateAlertRuleMutation = useUpdateAlertRule();
const saving = ref(false);
const { form, dirty } = useForm<AlertRuleFormState>({
	type: props.alert?.type ?? "issue",
	appName: props.alert?.appName ?? null,
	stageName: props.alert?.stageName ?? null,
	notificationDestinationIds: props.alert
		? [...props.alert.notificationDestinationIds]
		: []
});
const targetOptions = computed(() =>
	(targetsQuery.data.value ?? []).map(target => ({
		label: target.name,
		value: target.id
	}))
);
const appOptions = computed(() => [
	{ label: "All apps", value: null },
	...(appsQuery.data.value ?? []).map(app => ({
		label: app.appName,
		value: app.appName
	}))
]);
const stageOptions = computed(() => {
	const app = appsQuery.data.value?.find(
		item => item.appName === form.appName
	);
	return [
		{ label: "All stages", value: null },
		...(app?.stages ?? []).map(stage => ({
			label: stage.stageName,
			value: stage.stageName
		}))
	];
});

function selectApp(appName: string | null) {
	form.appName = appName;
	form.stageName = null;
}

function save() {
	saving.value = true;
	const input: AlertRuleInput = {
		type: form.type,
		notificationDestinationIds: form.notificationDestinationIds,
		...(form.appName ? { appName: form.appName } : {}),
		...(form.stageName ? { stageName: form.stageName } : {})
	};
	const callbacks = {
		onSuccess: () => emit("success"),
		onSettled: () => {
			saving.value = false;
		}
	};
	if (props.alert) {
		updateAlertRuleMutation.mutate(
			{ id: props.alert.id, input },
			callbacks
		);
	} else {
		createAlertRuleMutation.mutate(input, callbacks);
	}
}
</script>
