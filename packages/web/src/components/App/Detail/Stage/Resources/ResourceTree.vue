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
		<div v-for="group in groups" :key="group.label">
			<button
				v-if="group.support"
				type="button"
				class="resource-tree__group"
				:aria-expanded="supportExpanded || searching"
				@click="supportExpanded = !supportExpanded"
			>
				<q-icon
					:name="
						supportExpanded || searching
							? 'sym_r_expand_more'
							: 'sym_r_chevron_right'
					"
				/>
				{{ group.label }}
			</button>
			<div v-else class="resource-tree__group">{{ group.label }}</div>
			<template v-if="!group.support || supportExpanded || searching">
				<ResourceTreeItem
					v-for="resource in group.resources"
					:key="resource.resourceId"
					:resource="resource"
					:depth="0"
					:expanded-ids="expandedIds"
					:selected-id="selectedId"
					@select="$emit('select', $event)"
					@toggle="$emit('toggle', $event)"
				/>
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { ResourceTree } from "@sst-console/sdk";
import { computed, ref } from "vue";
import { isSupportResource } from "@/composables/apps/stage-resources";

import ResourceTreeItem from "./ResourceTreeItem.vue";

const props = defineProps<{
	expandedIds: ReadonlySet<string>;
	resources: ResourceTree[];
	searching: boolean;
	selectedId?: string | undefined;
}>();

const emit = defineEmits<{
	select: [resource: ResourceTree];
	toggle: [resourceId: string];
}>();

const treeElement = ref<HTMLElement>();
const supportExpanded = ref(false);
const nameOrder = new Intl.Collator(undefined, {
	sensitivity: "base",
	numeric: true
});
const groups = computed(() => {
	const result = new Map<string, ResourceTree[]>();
	for (const resource of props.resources) {
		const label = isSupportResource(resource)
			? "SST support entries"
			: resource.resourceType.startsWith("sst.aws.")
				? "SST components"
				: resource.resourceType.split(":")[0] || "Other";
		const items = result.get(label) ?? [];
		items.push(resource);
		result.set(label, items);
	}
	return [...result.entries()]
		.sort(([a], [b]) =>
			a === "SST components"
				? -1
				: b === "SST components"
					? 1
					: a === "SST support entries"
						? 1
						: b === "SST support entries"
							? -1
							: a.localeCompare(b)
		)
		.map(([label, resources]) => ({
			label,
			resources: resources.sort((a, b) =>
				nameOrder.compare(
					a.name || a.resourceId,
					b.name || b.resourceId
				)
			),
			support: label === "SST support entries"
		}));
});

const visibleResources = computed(() => {
	const result: ResourceTree[] = [];
	const visit = (resource: ResourceTree) => {
		result.push(resource);
		if (props.expandedIds.has(resource.resourceId))
			resource.children.forEach(visit);
	};
	groups.value.forEach(group => {
		if (!group.support || supportExpanded.value || props.searching)
			group.resources.forEach(visit);
	});
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
.resource-tree__group {
	background: none;
	border: 0;
	color: inherit;
	font-weight: 600;
	padding: 0.5rem;
}
</style>
