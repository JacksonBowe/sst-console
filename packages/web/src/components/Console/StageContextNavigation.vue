<template>
	<section v-if="isStageRoute">
		<q-separator class="q-my-md" />

		<div class="column q-gap-sm">
			<SSelect
				:model-value="appName"
				:options="appOptions"
				aria-label="Current app"
				emit-value
				label="App"
				map-options
				options-dense
				:loading="appsQuery.isPending.value"
				@update:model-value="openApp"
			/>
			<SSelect
				:model-value="stageName"
				:options="stageOptions"
				aria-label="Current stage"
				emit-value
				options-dense
				outlined
				label="Stage"
				map-options
				:loading="appsQuery.isPending.value"
				@update:model-value="openStage"
			/>
		</div>

		<q-separator class="q-my-md" />

		<nav class="q-mt-sm" aria-label="Stage navigation">
			<AppDrawerItem :item="overviewItem" />
			<AppDrawerItem
				v-if="localWorkspaceItem"
				:item="localWorkspaceItem"
			/>
			<template v-if="resourceItems.length">
				<div
					class="text-caption text-weight-medium text-uppercase text-secondary q-px-sm q-pt-sm q-pb-xs"
				>
					Resources
				</div>
				<AppDrawerItem
					v-for="item in resourceItems"
					:key="item.label"
					:item="item"
				/>
			</template>
		</nav>
	</section>
</template>

<script setup lang="ts">
import { AppDrawerItem, type DrawerNavItem } from "@/components/ui/Drawer";
import { SSelect } from "@/components/ui/Select";
import { useApps, useStage } from "@/composables/apps";
import { stageResourceCategoriesFor } from "@/composables/apps/stage-resources";
import { localSessionMatchesStage } from "@/composables/local";
import { useLocalSessionStore } from "@/stores/local-session";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const appsQuery = useApps();
const localSession = useLocalSessionStore();
const appName = computed(() => String(route.params.appName ?? ""));
const stageName = computed(() => String(route.params.stageName ?? ""));
const isStageRoute = computed(
	() =>
		route.name === "stage-detail" ||
		route.name === "stage-functions" ||
		route.name === "stage-local-workspace" ||
		route.name === "stage-resource",
);
const stageQuery = useStage(appName, stageName);

const appOptions = computed(() =>
	(appsQuery.data.value ?? []).map((app) => ({
		label: app.appName,
		value: app.appName,
	})),
);
const stageOptions = computed(() => {
	const app = appsQuery.data.value?.find(
		(app) => app.appName === appName.value,
	);
	return (app?.stages ?? []).map((stage) => ({
		label: stage.stageName,
		value: stage.stageName,
	}));
});
const overviewItem = computed<DrawerNavItem>(() => ({
	label: "Overview",
	icon: "sym_r_dashboard",
	to: stageOverviewPath(),
	exact: true,
}));
const localWorkspaceItem = computed<DrawerNavItem | undefined>(() => {
	if (
		!localSessionMatchesStage(localSession.identity, {
			appName: appName.value,
			stageName: stageName.value,
		})
	)
		return undefined;

	return {
		label: "Local Workspace",
		icon: "sym_r_terminal",
		to: `${stageOverviewPath()}/local`,
		exact: true,
		badge: "",
		badgeColor:
			localSession.status === "connected" ? "positive" : "warning",
	};
});
const resourceItems = computed<DrawerNavItem[]>(() => {
	const resources = stageQuery.data.value?.resources ?? [];
	return stageResourceCategoriesFor(resources).map((category) => ({
		label: category.label,
		icon: category.icon,
		to:
			category.key === "functions"
				? `${stageOverviewPath()}/functions`
				: `${stageOverviewPath()}/resources/${category.key}`,
		exact: true,
	}));
});

function stageOverviewPath(): string {
	return `/apps/${encodeURIComponent(appName.value)}/stages/${encodeURIComponent(stageName.value)}`;
}

function openApp(nextAppName: string | null): void {
	if (!nextAppName || nextAppName === appName.value) return;
	void router.push({ name: "app-detail", params: { appName: nextAppName } });
}

function openStage(nextStageName: string | null): void {
	if (!nextStageName || nextStageName === stageName.value) return;
	void router.push({
		name: "stage-detail",
		params: { appName: appName.value, stageName: nextStageName },
	});
}
</script>
