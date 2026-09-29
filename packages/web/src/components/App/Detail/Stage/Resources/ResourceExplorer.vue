<template>
	<q-card flat bordered>
		<div
			class="row items-center justify-between q-pa-md q-pb-sm q-gutter-sm"
		>
			<div class="text-subtitle1 text-weight-medium"
				>Resources ({{ resourceCount }})</div
			>
			<q-input
				v-model="search"
				dense
				outlined
				clearable
				placeholder="Search resources"
				aria-label="Search resources"
				class="resource-explorer__search"
			>
				<template #prepend><q-icon name="sym_r_search" /></template>
			</q-input>
		</div>
		<q-separator />
		<div class="resource-explorer__panes">
			<div class="resource-explorer__tree">
				<div
					v-if="!filteredResources.length"
					class="q-pa-md text-secondary"
				>
					No resources match this search.
				</div>
				<ResourceTreeView
					v-else
					:resources="filteredResources"
					:expanded-ids="visibleExpandedIds"
					:selected-id="selectedResource?.resourceId"
					@select="selectedResource = $event"
					@toggle="toggle"
				/>
			</div>
			<q-separator vertical class="gt-sm" />
			<div class="resource-explorer__details">
				<ResourceDetails :resource="selectedResource" />
			</div>
		</div>
	</q-card>
</template>

<script setup lang="ts">
import type { ResourceTree } from "@sst-console/sdk";
import { computed, ref } from "vue";

import ResourceDetails from "./ResourceDetails.vue";
import ResourceTreeView from "./ResourceTree.vue";

const props = defineProps<{ resources: ResourceTree[] }>();

const search = ref("");
const expandedIds = ref(new Set<string>());
const selectedResource = ref<ResourceTree>();

const resourceCount = computed(() => countResources(props.resources));
const filteredResources = computed(() =>
	filterResources(props.resources, search.value)
);
const visibleExpandedIds = computed(() => {
	if (!search.value.trim()) return expandedIds.value;
	return new Set([
		...expandedIds.value,
		...parentsOfMatchingResources(props.resources, search.value)
	]);
});

function toggle(resourceId: string) {
	const next = new Set(expandedIds.value);
	if (next.has(resourceId)) next.delete(resourceId);
	else next.add(resourceId);
	expandedIds.value = next;
}

function countResources(resources: ResourceTree[]): number {
	return resources.reduce(
		(count, resource) => count + 1 + countResources(resource.children),
		0
	);
}

function resourceMatches(resource: ResourceTree, query: string) {
	const normalizedQuery = query.trim().toLowerCase();
	if (!normalizedQuery) return true;
	return [
		resource.name,
		resource.resourceId,
		resource.resourceType,
		resource.normalizedArn
	]
		.filter((value): value is string => Boolean(value))
		.some(value => value.toLowerCase().includes(normalizedQuery));
}

function filterResources(
	resources: ResourceTree[],
	query: string
): ResourceTree[] {
	if (!query.trim()) return resources;
	return resources.flatMap(resource => {
		const children = filterResources(resource.children, query);
		if (!resourceMatches(resource, query) && !children.length) return [];
		return [{ ...resource, children }];
	});
}

function parentsOfMatchingResources(resources: ResourceTree[], query: string) {
	const result = new Set<string>();
	const visit = (resource: ResourceTree, parentIds: string[]) => {
		if (resourceMatches(resource, query))
			parentIds.forEach(id => result.add(id));
		resource.children.forEach(child =>
			visit(child, [...parentIds, resource.resourceId])
		);
	};
	resources.forEach(resource => visit(resource, []));
	return result;
}
</script>

<style scoped lang="scss">
.resource-explorer__search {
	width: min(100%, 18rem);
}

.resource-explorer__panes {
	display: grid;
	grid-template-columns: minmax(16rem, 34%) auto minmax(0, 1fr);
	min-height: 28rem;
}

.resource-explorer__tree,
.resource-explorer__details {
	min-width: 0;
}

@media (max-width: 599px) {
	.resource-explorer__panes {
		grid-template-columns: 1fr;
	}

	.resource-explorer__tree {
		border-bottom: 1px solid var(--q-separator-color);
		max-height: 20rem;
	}

	.resource-explorer__details {
		min-height: 16rem;
	}
}
</style>
