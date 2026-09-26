<template>
	<q-dialog ref="dialogRef" @hide="onDialogHide">
		<component
			:is="contentComponent"
			v-bind="contentProps"
			@success="onDialogOK"
		/>
	</q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from "quasar";
import type { Component } from "vue";

defineProps<{
	contentComponent: Component;
	contentProps?: Record<string, unknown>;
}>();

defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();
</script>
