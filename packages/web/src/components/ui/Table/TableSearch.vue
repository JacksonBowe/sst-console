<template>
	<s-input
		dense
		clearable
		placeholder="Search"
		clear-icon="sym_r_clear"
		:modelValue="modelValue"
		@update:modelValue="$emit('update:modelValue', $event)"
		:style="$q.screen.gt.xs ? 'width: 250px' : 'flex: 1'"
		class="q-mr-sm"
	>
		<template v-slot:append>
			<q-icon v-if="!modelValue" name="sym_r_search" />
		</template>
	</s-input>
</template>

<script setup lang="ts">
import SInput from "../Input/SInput.vue";

defineProps({
	modelValue: String
});
</script>
