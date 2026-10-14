<template>
	<q-card class="q-dialog-plugin">
		<q-form @submit.prevent="save">
			<q-card-section>
				<div class="text-h6">
					{{ alert ? "Edit alert" : "Create alert" }}
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
					v-model="form.targetIds"
					label="Targets"
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
					Create an Alert target before creating an Alert.
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
					:disable="!dirty || saving || !form.targetIds.length"
				/>
			</q-card-actions>
		</q-form>
	</q-card>
</template>

<script setup lang="ts">
import type { Alert, AlertInput } from "@sst-console/sdk";
import { computed, ref } from "vue";

import { api, handleApiError } from "@/boot/api-client";
import { useAlertTargets } from "@/composables/alert-targets";
import { useAlerts } from "@/composables/alerts";
import { useApps } from "@/composables/apps";
import { rules, useForm } from "@/components/ui/form";
import { SSelect } from "@/components/ui/Select";

type AlertFormState = Omit<AlertInput, "appName" | "stageName"> & {
	appName: string | null;
	stageName: string | null;
};

const props = defineProps<{ alert?: Alert }>();
const emit = defineEmits<{ success: [] }>();
const alertsQuery = useAlerts();
const targetsQuery = useAlertTargets();
const appsQuery = useApps();
const saving = ref(false);
const { form, dirty } = useForm<AlertFormState>({
	type: props.alert?.type ?? "issue",
	appName: props.alert?.appName ?? null,
	stageName: props.alert?.stageName ?? null,
	targetIds: props.alert ? [...props.alert.targetIds] : []
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

async function save() {
	saving.value = true;
	try {
		const input: AlertInput = {
			type: form.type,
			targetIds: form.targetIds,
			...(form.appName ? { appName: form.appName } : {}),
			...(form.stageName ? { stageName: form.stageName } : {})
		};
		if (props.alert) await api.updateAlert(props.alert.id, input);
		else await api.createAlert(input);
		await alertsQuery.refetch();
		emit("success");
	} catch (error) {
		handleApiError(error);
	} finally {
		saving.value = false;
	}
}
</script>
