<template>
	<div class="column q-gutter-xs">
		<AppDrawerItem
			v-if="localSession.permission === 'prompt'"
			:item="enableLocalSessionsItem"
			dense
			title="Allow browser access to local SST dev sessions."
			@click="localSession.enable()"
		/>

		<AppDrawerItem
			v-else-if="localSession.permission === 'denied'"
			:item="localSessionsBlockedItem"
			dense
			title="Allow local network access in browser site settings, then refresh."
		/>

		<AppDrawerItem
			v-if="localSession.identity && !isCurrentLocalStage"
			:item="workspaceItem"
			dense
		/>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import { AppDrawerItem, type DrawerNavItem } from "@/components/ui/Drawer";
import { useApps } from "@/composables/apps";
import { localSessionMatchesStage } from "@/composables/local";
import { useLocalSessionStore } from "@/stores/local-session";

const route = useRoute();
const localSession = useLocalSessionStore();
const appsQuery = useApps();
const enableLocalSessionsItem: DrawerNavItem = {
	label: "Enable local sessions",
	icon: "sym_r_lan",
	badge: "",
	badgeColor: "warning",
};
const localSessionsBlockedItem: DrawerNavItem = {
	label: "Local sessions blocked",
	icon: "sym_r_error",
	disabled: true,
	badge: "",
	badgeColor: "negative",
};
const isCurrentLocalStage = computed(() =>
	localSessionMatchesStage(localSession.identity, {
		appName: String(route.params.appName ?? ""),
		stageName: String(route.params.stageName ?? ""),
	}),
);
const workspacePath = computed(() => {
	const identity = localSession.identity;
	if (!identity) return "/local";

	const stage = appsQuery.data.value
		?.find((app) => app.appName === identity.app)
		?.stages.find(
			(stage) =>
				stage.stageName === identity.stage &&
				(!identity.region || identity.region === stage.region),
		);
	if (!stage) return "/local";

	return `/apps/${encodeURIComponent(identity.app)}/stages/${encodeURIComponent(identity.stage)}/local`;
});
const workspaceItem = computed<DrawerNavItem>(() => ({
	label: "Open Local Workspace",
	icon: "sym_r_terminal",
	to: workspacePath.value,
	exact: true,
	badge: "",
	badgeColor: localSession.status === "connected" ? "positive" : "warning",
}));
</script>
