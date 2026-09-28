<template>
	<q-expansion-item
		v-bind="$attrs"
		class="expansion-item"
		:class="[
			`expansion-item--${variant}`,
			{ 'expansion-item--expanded': isExpanded }
		]"
		@before-show="isExpanded = true"
		@before-hide="isExpanded = false"
	>
		<template #header>
			<div class="expansion-item__header">
				<div class="expansion-item__header-content">
					<slot name="header">
						<q-icon
							v-if="icon"
							:name="icon"
							class="expansion-item__icon"
						/>
						<div class="expansion-item__label-group">
							<div v-if="label" class="expansion-item__label">
								{{ label }}
							</div>
							<div v-if="caption" class="expansion-item__caption">
								{{ caption }}
							</div>
						</div>
					</slot>
				</div>
				<div class="expansion-item__header-side">
					<slot name="header-side" />
					<q-icon
						:name="expandIcon"
						class="expansion-item__expand-icon"
						:class="{
							'expansion-item__expand-icon--rotated': isExpanded
						}"
					/>
				</div>
			</div>
		</template>

		<div class="expansion-item__content">
			<slot />
		</div>
	</q-expansion-item>
</template>

<script setup lang="ts">
import { ref } from "vue";

withDefaults(
	defineProps<{
		label?: string;
		caption?: string;
		icon?: string;
		expandIcon?: string;
		variant?: "default" | "muted" | "warning" | "negative";
	}>(),
	{
		expandIcon: "sym_r_keyboard_arrow_down",
		variant: "default"
	}
);

const isExpanded = ref(false);
</script>

<style lang="scss">
.expansion-item {
	border: 1px solid var(--q-color-grey-4, #bdbdbd);
	border-radius: 6px;
	background: white;
	overflow: hidden;

	// Remove Quasar's default styling
	&.q-expansion-item {
		.q-expansion-item__container > .q-item {
			padding: 0;
			min-height: unset;

			// Remove Quasar's hover/focus background
			&::before {
				display: none;
			}
		}

		// Hide Quasar's default expand icon
		.q-expansion-item__toggle-icon {
			display: none;
		}
	}

	// Default variant
	&--default {
		.expansion-item__icon {
			color: var(--q-primary, #257e82);
		}

		&.expansion-item--expanded {
			border-color: var(--q-primary, #257e82);
		}
	}

	// Warning variant (for flags, alerts)
	&--warning {
		.expansion-item__icon {
			color: var(--q-warning, #f2c037);
		}

		&.expansion-item--expanded {
			border-color: var(--q-warning, #f2c037);
		}
	}

	&--muted {
		border-color: var(--q-text-muted, #616161);

		.expansion-item__icon,
		.expansion-item__label {
			color: var(--q-text-muted, #616161);
		}
	}

	&--negative {
		border-color: var(--q-negative, #c10015);

		.expansion-item__icon,
		.expansion-item__label {
			color: var(--q-negative, #c10015);
		}
	}
}

.expansion-item__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: 12px 16px;
	cursor: pointer;
	user-select: none;
}

.expansion-item__header-content {
	display: flex;
	align-items: center;
	gap: 12px;
	flex: 1;
	min-width: 0;
}

.expansion-item__header-side {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-shrink: 0;
}

.expansion-item__icon {
	font-size: 20px;
	flex-shrink: 0;
}

.expansion-item__label-group {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.expansion-item__label {
	font-weight: 500;
	font-size: 14px;
	color: var(--q-text-primary, #1d1d1d);
	line-height: 1.4;
}

.expansion-item__caption {
	font-size: 12px;
	color: var(--q-text-muted, #616161);
	line-height: 1.3;
}

.expansion-item__expand-icon {
	color: var(--q-text-muted, #757575);
	font-size: 20px;
	transition: transform 0.2s ease;

	&--rotated {
		transform: rotate(180deg);
	}
}

.expansion-item__content {
	padding: 8px 16px 16px;
	border-top: 1px solid var(--q-color-grey-3, #e0e0e0);
}

.body--dark .expansion-item {
	background: var(--q-dark, #171b23);
}

.body--dark
	.expansion-item:not(
		.expansion-item--expanded,
		.expansion-item--muted,
		.expansion-item--negative
	) {
	border-color: var(--q-border, #303946);
}

.body--dark .expansion-item__content {
	border-top-color: var(--q-border, #303946);
}
</style>
