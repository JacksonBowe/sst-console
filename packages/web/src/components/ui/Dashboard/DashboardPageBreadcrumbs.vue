<template>
	<nav aria-label="Breadcrumb" class="dashboard-page-breadcrumbs">
		<ol class="dashboard-page-breadcrumbs__list">
			<li
				v-for="(segment, index) in segments"
				:key="index"
				class="row no-wrap items-center"
			>
				<q-icon
					v-if="index"
					name="sym_r_chevron_right"
					color="secondary"
					size="18px"
					class="q-mx-xs"
				/>
				<router-link
					v-if="segment.to"
					:to="segment.to"
					class="dashboard-page-breadcrumbs__link ellipsis"
				>
					{{ segment.label }}
				</router-link>
				<span v-else class="text-body2 text-secondary ellipsis">
					{{ segment.label }}
				</span>
			</li>
		</ol>
	</nav>
</template>

<script lang="ts">
import type { RouteLocationRaw } from "vue-router";

export type DashboardPageBreadcrumb = {
	label: string;
	to?: RouteLocationRaw | undefined;
};
</script>

<script setup lang="ts">
defineProps<{ segments: DashboardPageBreadcrumb[] }>();
</script>

<style scoped lang="scss">
.dashboard-page-breadcrumbs__list {
	display: flex;
	list-style: none;
	margin: 0;
	max-width: 100%;
	padding: 0;
}

.dashboard-page-breadcrumbs__link {
	color: var(--q-primary);
	max-width: 16rem;
	text-decoration: none;
	font-weight: 500;
}

.dashboard-page-breadcrumbs__link:hover {
	text-decoration: underline;
}

li:last-child {
	min-width: 0;
}
</style>
