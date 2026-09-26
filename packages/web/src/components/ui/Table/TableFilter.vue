<template>
	<div class="flex items-center">
		<q-btn
			:color="$q.dark.isActive ? 'grey-10' : 'grey-3'"
			:text-color="$q.dark.isActive ? 'grey-5' : 'grey-9'"
			:label="label"
			no-caps
			icon-right="sym_r_keyboard_arrow_down"
			:ripple="false"
			unelevated
		>
			<q-badge
				v-if="modelValue?.length"
				floating
				:text-color="$q.dark.isActive ? 'black' : 'white'"
				>{{ modelValue?.length }}</q-badge
			>

			<q-menu
				:class="menuClass"
				fit
				anchor="bottom left"
				self="top left"
				:offset="[0, 8]"
			>
				<div class="column" style="width: 176px; height: 164px">
					<q-input
						dense
						filled
						v-model="filterTerm"
						:placeholder="`Filter ${label}`"
						clearable
						:class="inputClass"
					/>
					<q-scroll-area class="col">
						<q-option-group
							:options="filteredOptions"
							type="checkbox"
							:modelValue="modelValue"
							@update:modelValue="
								(val: string[]) =>
									emit('update:modelValue', val)
							"
							size="xs"
						/>
					</q-scroll-area>
				</div>
			</q-menu>
		</q-btn>
	</div>
</template>

<script setup lang="ts">
import { Dark } from "quasar";
import { computed, ref } from "vue";

interface Option {
	label: string;
	value: string;
}

const props = defineProps<{
	label: string;
	options: Option[];
	modelValue: string[] | null | undefined;
}>();

const emit = defineEmits<{
	(e: "update:modelValue", value: string[]): void;
}>();

const filterTerm = ref("");

const filteredOptions = computed(() => {
	if (!filterTerm.value) return props.options;
	return props.options.filter(o =>
		o.label.toLowerCase().includes(filterTerm.value.toLowerCase())
	);
});

const menuClass = computed(() => (Dark.isActive ? "bg-dark" : "bg-white"));
const inputClass = computed(() =>
	Dark.isActive ? "table-filter-input-dark" : ""
);
</script>

<style scoped>
.table-filter-input-dark2 :deep(.q-field__control) {
	background-color: #2a2a2a;
}
</style>
