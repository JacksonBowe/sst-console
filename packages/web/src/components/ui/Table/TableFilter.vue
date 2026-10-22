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
					:style="{ width: `${panelWidth}px` }"
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
					<q-scroll-area
						class="table-filter__options"
						:class="{ 'q-mt-sm': searchable }"
						:style="{ height: `${panelOptionsHeight}px` }"
						:vertical-bar-style="scrollbarStyle"
						:vertical-thumb-style="scrollbarThumbStyle"
					>
						<q-list
							class="q-gutter-y-xs"
							:class="{ 'q-mr-md': filteredOptions.length > 6 }"
							role="listbox"
						>
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
								<q-item-section>
									<span
										class="table-filter__option-label"
										:title="option.label"
									>
										{{ option.label }}
									</span>
								</q-item-section>
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

const props = withDefaults(
	defineProps<{
		label: string;
		options: Option[];
		modelValue: string[] | null | undefined;
		searchable?: boolean;
	}>(),
	{
		searchable: false
	}
);

const emit = defineEmits<{
	(e: "update:modelValue", value: string[]): void;
}>();

const LABEL_CHARACTER_WIDTH = 8;
const PANEL_HORIZONTAL_CHROME = 65;
const PANEL_MIN_WIDTH = 164;
const PANEL_MAX_WIDTH = 520;
const OPTION_ROW_HEIGHT = 36;
const PANEL_OPTIONS_MIN_HEIGHT = 72;
const PANEL_OPTIONS_MAX_HEIGHT = 224;

const filterTerm = ref("");
const panelWidth = computed(() => {
	const longestLabel = Math.max(
		props.label.length,
		...props.options.map(option => option.label.length)
	);
	return Math.min(
		Math.max(
			longestLabel * LABEL_CHARACTER_WIDTH + PANEL_HORIZONTAL_CHROME,
			PANEL_MIN_WIDTH
		),
		PANEL_MAX_WIDTH
	);
});

const filteredOptions = computed(() => {
	if (!props.searchable || !filterTerm.value) return props.options;
	return props.options.filter(o =>
		o.label.toLowerCase().includes(filterTerm.value.toLowerCase())
	);
});
const panelOptionsHeight = computed(() =>
	Math.min(
		Math.max(
			filteredOptions.value.length * OPTION_ROW_HEIGHT,
			PANEL_OPTIONS_MIN_HEIGHT
		),
		PANEL_OPTIONS_MAX_HEIGHT
	)
);
const scrollbarStyle = {
	borderRadius: "3px",
	background: "var(--q-secondary-3)",
	width: "6px",
	opacity: "1"
};
const scrollbarThumbStyle = {
	borderRadius: "3px",
	background: "var(--q-primary)",
	width: "6px",
	opacity: "1"
};

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
	width: 100%;
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

.table-filter__option-label {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.table-filter__empty {
	color: var(--q-text-muted);
	font-size: 0.875rem;
	text-align: center;
}
</style>
