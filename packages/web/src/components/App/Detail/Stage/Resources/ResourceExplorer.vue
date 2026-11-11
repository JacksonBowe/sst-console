<template>
	<q-card flat bordered class="column no-wrap">
		<template v-if="loading">
			<div class="q-pa-md">
				<q-skeleton type="text" width="12rem" />
				<q-skeleton type="text" width="10rem" />
			</div>
			<q-separator />
			<div class="row no-wrap col q-pa-md" aria-label="Loading resources">
				<div class="col-4"
					><q-skeleton
						v-for="i in 6"
						:key="i"
						type="text"
						width="70%"
						class="q-mb-sm"
				/></div>
				<q-skeleton class="col" type="rect" height="12rem" />
			</div>
		</template>
		<div
			v-else-if="!resources.length"
			class="column items-center text-center q-gutter-sm q-pa-xl"
		>
			<q-icon name="sym_r_account_tree" size="40px" color="secondary" />
			<div class="text-h6">No resources discovered</div>
			<div class="text-body2 text-secondary"
				>This Stage has no imported resources available to inspect.</div
			>
		</div>
		<template v-else>
			<div
				class="row items-center justify-between q-pa-md q-pb-sm q-gutter-sm"
			>
				<div>
					<div class="text-subtitle1 text-weight-medium"
						>Resource inspector</div
					>
					<div class="text-caption text-secondary">
						{{ counts.resources }} resources ·
						{{ counts.components }} components
					</div>
				</div>
				<q-input
					v-model="search"
					dense
					outlined
					clearable
					placeholder="Search resources"
					aria-label="Search resources"
				>
					<template #prepend><q-icon name="sym_r_search" /></template>
				</q-input>
			</div>
			<q-separator />
			<div
				class="no-wrap col"
				:class="$q.screen.lt.sm ? 'column' : 'row'"
			>
				<div
					class="relative-position"
					:class="$q.screen.lt.sm ? 'col' : 'col-sm-5 col-md-4'"
				>
					<q-scroll-area
						class="absolute-full"
						tabindex="0"
						role="region"
						aria-label="Resource tree"
					>
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
							:searching="Boolean(search.trim())"
							:selected-id="selectedResource?.resourceId"
							@select="selectedResource = $event"
							@toggle="toggle"
						/>
					</q-scroll-area>
				</div>
				<q-separator :vertical="!$q.screen.lt.sm" />
				<div class="col relative-position">
					<q-scroll-area
						class="absolute-full"
						:content-style="detailsContentStyle"
						:content-active-style="detailsContentStyle"
						tabindex="0"
						role="region"
						aria-label="Resource details"
					>
						<ResourceDetails :resource="selectedResource" />
					</q-scroll-area>
				</div>
			</div>
		</template>
	</q-card>
</template>

<script setup lang="ts">
import { stageResourceCounts } from "@/composables/apps/stage-resources";
import type { ResourceTree } from "@sst-console/sdk";
import { computed, ref } from "vue";

import ResourceDetails from "./ResourceDetails.vue";
import ResourceTreeView from "./ResourceTree.vue";

const props = defineProps<{ resources: ResourceTree[]; loading?: boolean }>();

const search = ref("");
const expandedIds = ref(new Set<string>());
const selectedResource = ref<ResourceTree>();
const detailsContentStyle = { width: "100%", height: "100%" };

const counts = computed(() => stageResourceCounts(props.resources));
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
