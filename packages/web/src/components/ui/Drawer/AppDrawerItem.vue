<template>
	<q-expansion-item
		v-if="hasChildren"
		v-model="isExpanded"
		:disable="item.disabled"
		:default-opened="hasActiveChild"
		:header-class="expansionHeaderClasses"
		:content-inset-level="0.45"
		:dense="dense"
		class="app-drawer-item--group rounded-borders"
	>
		<template #header>
			<q-item-section v-if="item.icon" side>
				<div class="app-drawer-item__icon-wrap">
					<q-icon :name="item.icon" size="sm" />
					<span
						v-if="childBadgeColor"
						class="app-drawer-item__dot"
						:class="`bg-${childBadgeColor}`"
					/>
				</div>
			</q-item-section>

			<q-item-section>
				<q-item-label>{{ item.label }}</q-item-label>
			</q-item-section>

			<q-item-section v-if="item.badge !== undefined" side>
				<q-badge
					:color="item.badgeColor ?? 'primary'"
					:label="item.badge"
				/>
			</q-item-section>
		</template>

		<AppDrawerItem
			v-for="child in item.children"
			:key="child.to ?? child.label"
			:item="child"
			:dense="dense"
			child
		/>
	</q-expansion-item>

	<q-item
		v-else
		clickable
		v-ripple
		:to="item.to"
		:exact="item.exact"
		:disable="item.disabled"
		:dense="dense"
		:active="isItemActive(item)"
		class="app-drawer-item rounded-borders"
		:class="{
			'app-drawer-item--child': child,
			'app-drawer-item--dense': dense
		}"
		active-class="app-drawer-item--active"
	>
		<q-item-section v-if="item.icon" side>
			<q-icon :name="item.icon" :size="child ? 'xs' : 'sm'" />
		</q-item-section>

		<q-item-section>
			<q-item-label>{{ item.label }}</q-item-label>
		</q-item-section>

		<q-item-section v-if="item.badge !== undefined" side>
			<q-badge
				:color="item.badgeColor ?? 'primary'"
				:label="item.badge"
			/>
		</q-item-section>
	</q-item>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";

import type { DrawerNavItem } from "./types";

const props = withDefaults(
	defineProps<{
		item: DrawerNavItem;
		child?: boolean;
		dense?: boolean;
	}>(),
	{
		child: false,
		dense: false
	}
);

const route = useRoute();
const isExpanded = ref(false);

const hasChildren = computed(() => Boolean(props.item.children?.length));

function normalizePath(path: string): string {
	return path.replace(/\/+$/, "") || "/";
}

function isItemActive(item: DrawerNavItem): boolean {
	if (!item.to) {
		return false;
	}

	const current = normalizePath(route.path);
	const target = normalizePath(item.to);

	if (item.exact) {
		return current === target;
	}

	return current === target || current.startsWith(`${target}/`);
}

const hasActiveChild = computed(() => {
	return props.item.children?.some(child => isItemActive(child)) ?? false;
});

const expansionHeaderClasses = computed(() => {
	return [
		"app-drawer-item__header",
		"rounded-borders",
		props.dense ? "app-drawer-item__header--dense" : "",
		hasActiveChild.value && !isExpanded.value
			? "app-drawer-item__header--has-active-child"
			: ""
	];
});

const badgeColorPriority = ["negative", "warning", "info", "primary"];

const childBadgeColor = computed(() => {
	const badgeColors = props.item.children
		?.filter(child => child.badge !== undefined)
		.map(child => child.badgeColor ?? "primary");

	if (!badgeColors?.length) {
		return undefined;
	}

	return (
		badgeColorPriority.find(color => badgeColors.includes(color)) ??
		badgeColors[0]
	);
});
</script>

<style lang="scss" scoped>
.app-drawer-item {
	min-height: 40px;
	margin-bottom: 3px;
	border-left: 3px solid transparent;
	color: var(--q-brand-simple, currentColor);
	transition:
		background-color 160ms ease,
		border-color 160ms ease;
}

.app-drawer-item--child {
	min-height: 36px;
	margin-left: 4px;
}

.app-drawer-item--dense {
	min-height: 32px;
}

.app-drawer-item--child.app-drawer-item--dense {
	min-height: 30px;
}

.app-drawer-item--active {
	border-left-color: var(--q-primary);
	background: color-mix(in srgb, var(--q-primary) 12%, transparent);
	color: var(--q-primary);
}

.app-drawer-item--group {
	margin-bottom: 3px;
	overflow: hidden;
}

:deep(.app-drawer-item__header) {
	min-height: 40px;
	overflow: hidden;
	border-left: 3px solid transparent;
	color: var(--q-brand-simple, currentColor);
	transition:
		background-color 160ms ease,
		border-color 160ms ease;
}

:deep(.app-drawer-item__header--dense) {
	min-height: 32px;
}

:deep(.app-drawer-item__header .q-focus-helper) {
	border-radius: inherit;
}

:deep(.app-drawer-item__header--has-active-child) {
	border-left-color: var(--q-primary);
	background: color-mix(in srgb, var(--q-primary) 10%, transparent);
}

.app-drawer-item__icon-wrap {
	position: relative;
	display: inline-flex;
}

.app-drawer-item__dot {
	position: absolute;
	top: -2px;
	right: -4px;
	width: 8px;
	height: 8px;
	border: 1px solid white;
	border-radius: 50%;
}

.body--dark .app-drawer-item--active,
.body--dark :deep(.app-drawer-item__header--has-active-child) {
	background: color-mix(in srgb, var(--q-primary) 20%, transparent);
}

.body--dark .app-drawer-item__dot {
	border-color: var(--q-dark);
}
</style>
