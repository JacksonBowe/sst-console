<template>
	<q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
		<q-card :style="cardStyle">
			<q-card-section class="column flex-center q-gutter-y-sm q-pb-none">
				<q-avatar
					v-if="icon"
					:icon="icon"
					text-color="primary"
					font-size="32px"
					style="background-color: var(--q-primary-2)"
				/>
				<div v-if="title" class="text-h6">{{ title }}</div>
				<div v-else style="height: 24px"></div>

				<div class="close-popup-icon">
					<q-icon
						name="sym_r_close"
						size="sm"
						class="cursor-pointer"
						@click="onDialogCancel"
					/>
				</div>
			</q-card-section>

			<q-card-section>
				<component
					:is="contentComponent"
					v-bind="contentProps"
					@success="onDialogOK"
				/>
			</q-card-section>
		</q-card>
	</q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent, useQuasar } from "quasar";
import { computed, type Component } from "vue";

defineProps<{
	title?: string;
	icon?: string;
	contentComponent?: Component;
	contentProps?: Record<string, unknown>;
}>();

defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
	useDialogPluginComponent();

const $q = useQuasar();

const cardStyle = computed(() => ({
	width: $q.screen.gt.xs ? "400px" : "300px"
}));
</script>

<style lang="scss">
.close-popup-icon {
	position: absolute;
	top: 16px;
	right: 16px;
	cursor: pointer;
}

.close-popup-icon:hover {
	color: var(--q-primary);
}
</style>
