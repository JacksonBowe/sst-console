<template>
	<div
		class="pill-tabs"
		:class="{ 'pill-tabs--icons-mobile': iconsOnMobile }"
		role="tablist"
	>
		<button
			v-for="opt in options"
			:key="String(opt.value)"
			type="button"
			role="tab"
			class="pill-tabs__btn"
			:class="{ 'pill-tabs__btn--active': isActive(opt.value) }"
			:aria-selected="isActive(opt.value)"
			:aria-label="opt.label"
			:disabled="opt.disabled"
			@click="select(opt.value)"
		>
			<q-icon
				v-if="iconsOnMobile && opt.icon"
				:name="opt.icon"
				class="pill-tabs__icon"
				size="20px"
			/>
			<span class="pill-tabs__label">{{ opt.label }}</span>
			<span
				v-if="opt.count !== undefined && opt.count !== null"
				class="pill-tabs__count"
			>
				{{ opt.count }}
			</span>
			<q-tooltip
				v-if="opt.tooltip"
				anchor="top middle"
				self="bottom middle"
				:offset="[0, 8]"
			>
				{{ opt.tooltip }}
			</q-tooltip>
		</button>
	</div>
</template>

<script setup lang="ts" generic="T extends string | number">
import type { PillTabOption } from "./types";

const props = defineProps<{
	modelValue: T;
	options: PillTabOption<T>[];
	iconsOnMobile?: boolean;
}>();

const emit = defineEmits<{
	"update:modelValue": [value: T];
}>();

function isActive(value: T): boolean {
	return props.modelValue === value;
}

function select(value: T) {
	if (value === props.modelValue) return;
	emit("update:modelValue", value);
}
</script>

<style lang="scss" scoped>
.pill-tabs {
	display: inline-flex;
	align-items: center;
	gap: 2px;
	padding: 4px;
	background: var(--q-secondary-3);
	border-radius: $generic-border-radius;
}

.pill-tabs__btn {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	padding: 6px 12px;
	border: 0;
	background: transparent;
	border-radius: $button-border-radius;
	font: inherit;
	font-size: 13px;
	font-weight: 500;
	color: var(--q-text-primary);
	opacity: 0.7;
	cursor: pointer;
	transition:
		background-color 0.15s ease,
		color 0.15s ease,
		opacity 0.15s ease,
		box-shadow 0.15s ease;

	&:hover:not(:disabled) {
		opacity: 1;
		background: var(--q-secondary-2);
	}

	&:focus-visible {
		outline: 2px solid var(--q-focus-ring);
		outline-offset: 2px;
	}

	&:disabled {
		cursor: not-allowed;
		opacity: 0.4;
	}
}

.pill-tabs__btn--active,
.pill-tabs__btn--active:hover {
	background: var(--q-page);
	color: var(--q-primary);
	opacity: 1;
	box-shadow:
		0 1px 2px color-mix(in srgb, var(--q-text-primary) 6%, transparent),
		0 0 0 1px var(--q-border);
}

.pill-tabs__count {
	font-variant-numeric: tabular-nums;
	font-size: 12px;
	font-weight: 500;
	opacity: 0.55;
}

.pill-tabs__icon {
	display: none;
}

@media (max-width: 599px) {
	.pill-tabs--icons-mobile .pill-tabs__btn:has(.pill-tabs__icon) {
		padding: 6px 10px;
	}
	.pill-tabs--icons-mobile .pill-tabs__icon {
		display: inline-flex;
	}
	.pill-tabs--icons-mobile .pill-tabs__icon + .pill-tabs__label {
		display: none;
	}
}

.pill-tabs__btn--active .pill-tabs__count {
	opacity: 0.8;
}
</style>
