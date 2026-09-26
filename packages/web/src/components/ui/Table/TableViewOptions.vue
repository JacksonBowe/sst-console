<template>
	<div class="flex items-center">
		<q-btn
			:label="label || ''"
			unelevated
			no-caps
			icon="sym_r_view_week"
			:ripple="true"
			:color="color"
			:text-color="textColor"
		>
			<q-menu :offset="[0, 8]">
				<q-card style="width: 130px">
					<q-card-section class="q-pa-sm">
						<q-option-group
							size="xs"
							type="checkbox"
							:options="options"
							:modelValue="modelValue"
							@update:modelValue="
								emit('update:modelValue', $event)
							"
						/>
					</q-card-section>
				</q-card>
			</q-menu>
		</q-btn>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { type ExtendedQTableColumn } from "./index";

const props = withDefaults(
	defineProps<{
		label?: string;
		columns: ExtendedQTableColumn[];
		modelValue?: string[];
		color?: string;
		textColor?: string;
	}>(),
	{
		color: "primary-2",
		textColor: "primary"
	}
);

const emit = defineEmits<{
	(e: "update:modelValue", value: string[]): void;
}>();

const options = computed(() =>
	props.columns
		.filter(c => c.required !== true)
		.map(c => ({ label: c.label, value: c.name }))
);
</script>
