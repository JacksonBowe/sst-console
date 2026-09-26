<template>
	<div class="pill-tabs" role="tablist">
		<button
			v-for="opt in options"
			:key="String(opt.value)"
			type="button"
			role="tab"
			class="pill-tabs__btn"
			:class="{ 'pill-tabs__btn--active': isActive(opt.value) }"
			:aria-selected="isActive(opt.value)"
			:disabled="opt.disabled"
			@click="select(opt.value)"
		>
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
	background: rgba(127, 127, 127, 0.1);
	border-radius: 10px;
}

.pill-tabs__btn {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	padding: 6px 12px;
	border: 0;
	background: transparent;
	border-radius: 7px;
	font: inherit;
	font-size: 13px;
	font-weight: 500;
	color: var(--q-dark);
	opacity: 0.7;
	cursor: pointer;
	transition:
		background-color 0.15s ease,
		color 0.15s ease,
		opacity 0.15s ease,
		box-shadow 0.15s ease;

	&:hover:not(:disabled) {
		opacity: 1;
		background: rgba(127, 127, 127, 0.08);
	}

	&:focus-visible {
		outline: none;
		box-shadow: 0 0 0 2px var(--q-primary);
	}

	&:disabled {
		cursor: not-allowed;
		opacity: 0.4;
	}
}

.body--dark .pill-tabs__btn {
	color: #fff;
}

.pill-tabs__btn--active,
.pill-tabs__btn--active:hover {
	background: #fff;
	color: var(--q-primary);
	opacity: 1;
	box-shadow:
		0 1px 2px rgba(0, 0, 0, 0.06),
		0 0 0 1px rgba(0, 0, 0, 0.04);
}

.body--dark .pill-tabs__btn--active,
.body--dark .pill-tabs__btn--active:hover {
	background: rgba(255, 255, 255, 0.12);
	color: #fff;
	box-shadow:
		0 1px 2px rgba(0, 0, 0, 0.3),
		0 0 0 1px rgba(255, 255, 255, 0.06);
}

.pill-tabs__count {
	font-variant-numeric: tabular-nums;
	font-size: 12px;
	font-weight: 500;
	opacity: 0.55;
}

.pill-tabs__btn--active .pill-tabs__count {
	opacity: 0.8;
}
</style>
