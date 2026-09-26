<script setup lang="ts">
import type { QSelect as QSelectInstance } from "quasar";
import { QSelect } from "quasar";
import { computed, ref, useAttrs } from "vue";

// ---------------------------------------------------------------------------
// Props — intercept what we override; everything else flows via $attrs.
// ---------------------------------------------------------------------------

defineOptions({ inheritAttrs: false });

const props = withDefaults(
	defineProps<{
		modelValue?: any;
		/** Use outlined design by default (shadcn aesthetic) */
		outlined?: boolean;
		/** Dense mode by default (shadcn compact) */
		dense?: boolean;
		/** Dense options list (consistent with field density) */
		optionsDense?: boolean;
		/** External label rendered above the select (shadcn pattern). Suppresses QSelect's floating label. */
		label?: string;
	}>(),
	{
		outlined: true,
		dense: true
	}
);

const emit = defineEmits<{
	"update:modelValue": [value: any];
}>();

// ---------------------------------------------------------------------------
// Strip `label` from attrs forwarded to QSelect so the floating label
// never renders — we handle it externally.
// ---------------------------------------------------------------------------

const attrs = useAttrs();
const forwardedAttrs = computed(() => {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { label, ...rest } = attrs as Record<string, unknown>;
	return rest;
});

// ---------------------------------------------------------------------------
// Forward QSelect's public API
// ---------------------------------------------------------------------------

const qRef = ref<QSelectInstance | null>(null);

defineExpose({
	// Field
	focus: () => qRef.value?.focus(),
	blur: () => qRef.value?.blur(),
	validate: (val?: unknown) => qRef.value?.validate(val),
	resetValidation: () => qRef.value?.resetValidation(),

	// Popup
	showPopup: () => qRef.value?.showPopup(),
	hidePopup: () => qRef.value?.hidePopup(),
	updateMenuPosition: () => qRef.value?.updateMenuPosition(),

	// Virtual scroll
	scrollTo: (index: number | string, edge?: string) =>
		(qRef.value as any)?.scrollTo(index, edge),
	reset: () => (qRef.value as any)?.reset(),
	refresh: (index?: string | number) => (qRef.value as any)?.refresh(index),

	// Selection
	removeAtIndex: (index: number) => qRef.value?.removeAtIndex(index),
	add: (opt: any, unique?: boolean) => qRef.value?.add(opt, unique),
	toggleOption: (opt: any, keepOpen?: boolean) =>
		qRef.value?.toggleOption(opt, keepOpen),

	// Option navigation
	getOptionIndex: () => qRef.value?.getOptionIndex(),
	setOptionIndex: (index: number) => qRef.value?.setOptionIndex(index),
	moveOptionSelection: (offset?: number, skipInputValue?: boolean) =>
		qRef.value?.moveOptionSelection(offset, skipInputValue),

	// Filter / input
	filter: (value: string) => qRef.value?.filter(value),
	updateInputValue: (value: string, noFilter?: boolean) =>
		qRef.value?.updateInputValue(value, noFilter),

	// Introspection
	isOptionSelected: (opt: any) => qRef.value?.isOptionSelected(opt),
	getEmittingOptionValue: (opt: any) =>
		qRef.value?.getEmittingOptionValue(opt),
	getOptionValue: (opt: any) => qRef.value?.getOptionValue(opt),
	getOptionLabel: (opt: any) => qRef.value?.getOptionLabel(opt),
	isOptionDisabled: (opt: any) => qRef.value?.isOptionDisabled(opt),

	get hasError() {
		return qRef.value?.hasError ?? false;
	}
});
</script>

<template>
	<div class="s-select">
		<label v-if="label" class="s-select__label">{{ label }}</label>
		<QSelect
			ref="qRef"
			v-bind="forwardedAttrs"
			:model-value="props.modelValue"
			:outlined="outlined"
			:dense="dense"
			:options-dense="optionsDense"
			:menu-offset="[0, 4]"
			transition-show="jump-down"
			transition-hide="jump-down"
			dropdown-icon="sym_r_keyboard_arrow_down"
			@update:model-value="emit('update:modelValue', $event)"
		>
			<template v-for="(_, name) in $slots" #[name]="slotProps">
				<slot :name="name" v-bind="slotProps ?? {}" />
			</template>
		</QSelect>
	</div>
</template>

<style lang="scss" scoped>
// ==========================================================
// SSelect — shadcn overrides for QSelect
// ==========================================================
// The heavy lifting for menu/chip/item styling is in the
// theme partials (_menu.scss, _chip.scss, _item.scss).
// This file handles select-specific concerns only.
// ==========================================================

// ---------- Wrapper (external label layout) ----------

.s-select {
	display: flex;
	flex-direction: column;

	&__label {
		font-size: 0.875rem;
		font-weight: 500;
		color: $grey-7;
		margin-bottom: 6px;
		line-height: 1.25;
		user-select: none;
	}
}

// ---------- Dropdown icon ----------

.q-select {
	.q-select__dropdown-icon {
		color: $grey-4;
	}

	// &:hover .q-select__dropdown-icon {
	// 	color: $grey-6;
	// }

	// ---------- Chips inside select ----------

	// &.q-select--with-chips {
	// 	.q-field__native {
	// 		gap: 4px;
	// 		flex-wrap: wrap;
	// 		padding: 2px 0;
	// 	}

	// 	// Make chips inside the field denser
	// 	.q-chip {
	// 		margin: 0;
	// 	}
	// }

	// ---------- Disabled ----------

	// &.q-field--disabled {
	// 	opacity: 0.5;

	// 	.q-select__dropdown-icon {
	// 		color: $grey-3;
	// 	}
	// }

	// ---------- Suppress focus-helper overlay ----------

	// > .q-field__inner > .q-field__control > .q-field__control-container {
	// 	> .q-field__native {
	// 		// Tighten up the native display area
	// 		min-height: 0;
	// 	}
	// }
}
</style>
