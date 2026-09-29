<template>
	<div
		:id="`resource-${resource.resourceId}`"
		class="resource-tree-item"
		:class="{
			'resource-tree-item--selected': resource.resourceId === selectedId
		}"
		:style="{ paddingLeft: `${depth * 1.25 + 0.25}rem` }"
	>
		<button
			v-if="resource.children.length"
			class="resource-tree-item__toggle"
			type="button"
			:aria-label="`${expanded ? 'Collapse' : 'Expand'} ${resourceLabel}`"
			@click="$emit('toggle', resource.resourceId)"
		>
			<q-icon
				:name="expanded ? 'sym_r_expand_more' : 'sym_r_chevron_right'"
				size="18px"
			/>
		</button>
		<span v-else class="resource-tree-item__toggle" aria-hidden="true" />
		<button
			class="resource-tree-item__select"
			type="button"
			role="treeitem"
			:aria-level="depth + 1"
			:aria-expanded="resource.children.length ? expanded : undefined"
			:aria-selected="resource.resourceId === selectedId"
			@click="$emit('select', resource)"
		>
			<q-icon
				:name="
					resource.resourceKind === 'component'
						? 'sym_r_account_tree'
						: 'sym_r_deployed_code'
				"
				size="18px"
			/>
			<span class="ellipsis">{{ resourceLabel }}</span>
		</button>
	</div>

	<template v-if="expanded">
		<ResourceTreeItem
			v-for="child in resource.children"
			:key="child.resourceId"
			:resource="child"
			:depth="depth + 1"
			:expanded-ids="expandedIds"
			:selected-id="selectedId"
			@select="$emit('select', $event)"
			@toggle="$emit('toggle', $event)"
		/>
	</template>
</template>

<script setup lang="ts">
import type { ResourceTree } from "@sst-console/sdk";
import { computed } from "vue";

const props = defineProps<{
	depth: number;
	expandedIds: ReadonlySet<string>;
	resource: ResourceTree;
	selectedId?: string | undefined;
}>();

defineEmits<{
	select: [resource: ResourceTree];
	toggle: [resourceId: string];
}>();

const expanded = computed(() =>
	props.expandedIds.has(props.resource.resourceId)
);
const resourceLabel = computed(
	() => props.resource.name || props.resource.resourceId
);
</script>

<style scoped lang="scss">
.resource-tree-item {
	display: flex;
	align-items: center;
	min-width: 0;
}

.resource-tree-item__toggle,
.resource-tree-item__select {
	align-items: center;
	background: transparent;
	border: 0;
	border-radius: 4px;
	color: inherit;
	display: flex;
	height: 2rem;
	padding: 0;
}

.resource-tree-item__toggle {
	flex: 0 0 2rem;
	justify-content: center;
}

button.resource-tree-item__toggle {
	cursor: pointer;
}

.resource-tree-item__select {
	flex: 1;
	gap: 0.5rem;
	min-width: 0;
	padding-right: 0.5rem;
	text-align: left;
}

button.resource-tree-item__select {
	cursor: pointer;
}

.resource-tree-item--selected .resource-tree-item__select {
	background: color-mix(in srgb, var(--q-primary) 14%, transparent);
	color: var(--q-primary);
}
</style>
