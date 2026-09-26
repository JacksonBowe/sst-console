<script setup lang="ts">
import { ref } from "vue";

import SInput from "./SInput.vue";

withDefaults(
	defineProps<{
		modelValue?: string | number | null | undefined;
		label?: string;
		autocomplete?: string;
		rules?: unknown[];
		lazyRules?: boolean | "ondemand";
		hideBottomSpace?: boolean;
		disable?: boolean;
		allowVisibilityToggle?: boolean;
	}>(),
	{
		allowVisibilityToggle: true
	}
);

const emit = defineEmits<{
	"update:modelValue": [value: string];
}>();

const showPassword = ref(false);
</script>

<template>
	<SInput
		:model-value="modelValue"
		:type="showPassword ? 'text' : 'password'"
		:label="label"
		:autocomplete="autocomplete"
		:rules="rules"
		:lazy-rules="lazyRules"
		:hide-bottom-space="hideBottomSpace"
		:disable="disable"
		@update:model-value="emit('update:modelValue', String($event ?? ''))"
	>
		<template #labelActions>
			<slot name="labelActions" />
		</template>

		<template v-if="allowVisibilityToggle" #append>
			<q-icon
				class="cursor-pointer"
				:name="
					showPassword ? 'sym_r_visibility_off' : 'sym_r_visibility'
				"
				@click="showPassword = !showPassword"
			/>
		</template>
	</SInput>
</template>
