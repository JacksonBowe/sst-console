<script setup lang="ts">
import type { QInput as QInputInstance } from "quasar";
import { QInput } from "quasar";
import { computed, ref, useAttrs } from "vue";

// ---------------------------------------------------------------------------
// Props — intercept what we override; everything else flows via $attrs.
// ---------------------------------------------------------------------------

defineOptions({ inheritAttrs: false });

const props = withDefaults(
	defineProps<{
		modelValue?: string | number | null | undefined;
		outlined?: boolean;
		dense?: boolean;
		/** External label rendered above the input (shadcn pattern). Suppresses QInput's floating label. */
		label?: string | undefined;
	}>(),
	{
		outlined: true,
		dense: true,
	},
);

const emit = defineEmits<{
	"update:modelValue": [value: string | number | null];
}>();

// ---------------------------------------------------------------------------
// Strip `label` from attrs forwarded to QInput so the floating label
// never renders — we handle it externally.
// ---------------------------------------------------------------------------

const attrs = useAttrs();
const forwardedAttrs = computed(() => {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { label, ...rest } = attrs as Record<string, unknown>;
	return rest;
});

// ---------------------------------------------------------------------------
// Forward QInput's public API
// ---------------------------------------------------------------------------

const qRef = ref<QInputInstance | null>(null);

defineExpose({
	focus: () => qRef.value?.focus(),
	blur: () => qRef.value?.blur(),
	select: () => qRef.value?.select(),
	validate: (val?: unknown) => qRef.value?.validate(val),
	resetValidation: () => qRef.value?.resetValidation(),
	getNativeElement: () => qRef.value?.getNativeElement(),
	get hasError() {
		return qRef.value?.hasError ?? false;
	},
	get nativeEl() {
		return qRef.value?.nativeEl ?? null;
	},
});
</script>

<template>
	<div class="s-input">
		<div
			v-if="label || $slots.labelActions"
			class="row items-center justify-between q-mb-xs"
		>
			<label v-if="label" class="s-input__label">{{ label }}</label>
			<slot name="labelActions" />
		</div>
		<QInput
			ref="qRef"
			v-bind="forwardedAttrs"
			:model-value="props.modelValue"
			:outlined="outlined"
			:dense="dense"
			@update:model-value="emit('update:modelValue', $event)"
		>
			<template v-for="(_, name) in $slots" #[name]="slotProps">
				<slot :name="name" v-bind="slotProps ?? {}" />
			</template>
		</QInput>
	</div>
</template>

<style lang="scss" scoped>
.s-input {
	// Wrapper for label + field
	display: flex;
	flex-direction: column;

	&__label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--q-text-secondary);
		line-height: 1.25;
		user-select: none;
	}

	:deep(
		.q-field--outlined:not(.q-field--focused):not(.q-field--error)
			.q-field__control::before
	) {
		border-color: $separator-color;
	}
}

.body--dark .s-input {
	:deep(
		.q-field--outlined:not(.q-field--focused):not(.q-field--error)
			.q-field__control::before
	) {
		border-color: $separator-dark-color;
	}
}
</style>
