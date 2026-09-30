<template>
	<div class="flex items-center">
		<q-btn
			class="table-filter__trigger"
			:label="label"
			no-caps
			icon-right="sym_r_keyboard_arrow_down"
			:ripple="false"
			unelevated
		>
			<q-badge
				v-if="modelValue?.length"
				class="table-filter__badge"
				floating
				>{{ modelValue?.length }}</q-badge
			>

			<q-menu
				class="table-filter__menu"
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
						class="table-filter__input"
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
</script>

<style lang="scss" scoped>
.table-filter__trigger {
	background: var(--q-secondary-2);
	color: var(--q-text-primary);
}

.table-filter__badge {
	background: var(--q-primary);
	color: var(--q-page);
}

.table-filter__menu {
	background: var(--q-page);
	color: var(--q-text-primary);
}

.table-filter__input {
	:deep(.q-field__control) {
		background: var(--q-secondary-3);
	}

	:deep(.q-field__native),
	:deep(.q-field__prepend),
	:deep(.q-field__append) {
		color: var(--q-text-primary);
	}
}
</style>
