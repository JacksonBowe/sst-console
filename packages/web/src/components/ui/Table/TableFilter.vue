<template>
	<div class="flex items-stretch self-stretch">
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
				anchor="bottom left"
				self="top left"
				:offset="[0, 8]"
			>
				<div
					class="table-filter__panel"
					:class="`table-filter__panel--${props.menuWidth}`"
				>
					<q-input
						v-if="searchable"
						dense
						v-model="filterTerm"
						:placeholder="`Filter ${label}`"
						clearable
						clear-icon="sym_r_clear"
						outlined
						class="table-filter__input"
					>
						<template #prepend>
							<q-icon name="sym_r_search" />
						</template>
					</q-input>
					<div
						class="table-filter__options"
						:class="{ 'q-mt-sm': searchable }"
					>
						<q-list class="q-gutter-y-xs" role="listbox">
							<q-item
								v-for="option in filteredOptions"
								:key="option.value"
								:active="
									modelValue?.includes(option.value) ?? false
								"
								:aria-selected="
									modelValue?.includes(option.value) ?? false
								"
								class="table-filter__option q-px-sm q-py-xs"
								clickable
								dense
								role="option"
								@click="toggleOption(option.value)"
							>
								<q-item-section>{{
									option.label
								}}</q-item-section>
								<q-item-section
									v-if="modelValue?.includes(option.value)"
									side
								>
									<q-icon
										name="sym_r_check"
										color="primary"
									/>
								</q-item-section>
							</q-item>
							<div
								v-if="filteredOptions.length === 0"
								class="table-filter__empty q-pa-lg"
							>
								No options found.
							</div>
						</q-list>
					</div>
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

type FilterWidth = "narrow" | "normal" | "wide";

const props = withDefaults(
	defineProps<{
		label: string;
		options: Option[];
		modelValue: string[] | null | undefined;
		searchable?: boolean;
		menuWidth?: FilterWidth;
	}>(),
	{
		searchable: false,
		menuWidth: "normal",
	},
);

const emit = defineEmits<{
	(e: "update:modelValue", value: string[]): void;
}>();

const filterTerm = ref("");

const filteredOptions = computed(() => {
	if (!props.searchable || !filterTerm.value) return props.options;
	return props.options.filter((o) =>
		o.label.toLowerCase().includes(filterTerm.value.toLowerCase()),
	);
});

function toggleOption(value: string): void {
	const selected = new Set(props.modelValue ?? []);

	if (selected.has(value)) selected.delete(value);
	else selected.add(value);

	emit("update:modelValue", [...selected]);
}
</script>

<style lang="scss" scoped>
.table-filter__trigger {
	background: var(--q-secondary-2);
	color: var(--q-text-primary);
	// min-height: 40px; // Leave for now
}

.table-filter__badge {
	background: var(--q-primary);
	color: var(--q-page);
}

.table-filter__menu {
	background: var(--q-page);
	color: var(--q-text-primary);
	border: 1px solid var(--q-border);
	border-radius: $generic-border-radius;
	box-shadow: 0 8px 24px
		color-mix(in srgb, var(--q-text-primary) 12%, transparent);
}

.table-filter__panel {
	display: flex;
	flex-direction: column;
	padding: 8px;

	&--narrow {
		width: 164px;
	}

	&--normal {
		width: 224px;
	}

	&--wide {
		width: 286px;
	}
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

	:deep(.q-field__control::before) {
		border-color: var(--q-border);
	}
}

.table-filter__options {
	max-height: 224px;
	overflow-y: auto;
}

.table-filter__option {
	border-radius: $generic-border-radius;

	&:hover {
		background: var(--q-secondary-3);
	}

	&.q-item--active {
		background: var(--q-secondary-2);
		color: var(--q-text-primary);
	}
}

.table-filter__empty {
	color: var(--q-text-muted);
	font-size: 0.875rem;
	text-align: center;
}
</style>
