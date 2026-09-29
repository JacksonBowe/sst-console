<template>
	<div
		ref="treeElement"
		class="resource-tree"
		role="tree"
		tabindex="0"
		:aria-activedescendant="
			selectedId ? `resource-${selectedId}` : undefined
		"
		@keydown="handleKeydown"
	>
		<ResourceTreeItem
			v-for="resource in resources"
			:key="resource.resourceId"
			:resource="resource"
			:depth="0"
			:expanded-ids="expandedIds"
			:selected-id="selectedId"
			@select="$emit('select', $event)"
			@toggle="$emit('toggle', $event)"
		/>
	</div>
</template>

<script setup lang="ts">
import type { ResourceTree } from "@sst-console/sdk";
import { computed, ref } from "vue";

import ResourceTreeItem from "./ResourceTreeItem.vue";

const props = defineProps<{
	expandedIds: ReadonlySet<string>;
	resources: ResourceTree[];
	selectedId?: string | undefined;
}>();

const emit = defineEmits<{
	select: [resource: ResourceTree];
	toggle: [resourceId: string];
}>();

const treeElement = ref<HTMLElement>();

const visibleResources = computed(() => {
	const result: ResourceTree[] = [];
	const visit = (resource: ResourceTree) => {
		result.push(resource);
		if (props.expandedIds.has(resource.resourceId))
			resource.children.forEach(visit);
	};
	props.resources.forEach(visit);
	return result;
});

const parents = computed(() => {
	const result = new Map<string, ResourceTree>();
	const visit = (resource: ResourceTree) => {
		resource.children.forEach(child => {
			result.set(child.resourceId, resource);
			visit(child);
		});
	};
	props.resources.forEach(visit);
	return result;
});

function select(resource: ResourceTree | undefined) {
	if (resource) emit("select", resource);
}

function handleKeydown(event: KeyboardEvent) {
	const selectedIndex = visibleResources.value.findIndex(
		resource => resource.resourceId === props.selectedId
	);
	const selected = visibleResources.value[selectedIndex];

	switch (event.key) {
		case "ArrowDown":
			event.preventDefault();
			select(
				visibleResources.value[Math.max(0, selectedIndex + 1)] ??
					visibleResources.value[0]
			);
			break;
		case "ArrowUp":
			event.preventDefault();
			select(
				visibleResources.value[Math.max(0, selectedIndex - 1)] ??
					visibleResources.value[0]
			);
			break;
		case "ArrowRight":
			if (!selected?.children.length) return;
			event.preventDefault();
			if (!props.expandedIds.has(selected.resourceId))
				emit("toggle", selected.resourceId);
			else select(selected.children[0]);
			break;
		case "ArrowLeft": {
			if (!selected) return;
			event.preventDefault();
			if (props.expandedIds.has(selected.resourceId))
				emit("toggle", selected.resourceId);
			else select(parents.value.get(selected.resourceId));
			break;
		}
		case "Home":
			event.preventDefault();
			select(visibleResources.value[0]);
			break;
		case "End":
			event.preventDefault();
			select(visibleResources.value.at(-1));
	}
}
</script>

<style scoped lang="scss">
.resource-tree {
	overflow: auto;
	padding: 0.5rem;
}
</style>
