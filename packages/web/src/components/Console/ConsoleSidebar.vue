<template>
	<AppDrawer
		:model-value="modelValue"
		:show-if-above="true"
		:width="264"
		@update:model-value="emit('update:modelValue', $event)"
	>
		<template #brand>
			<router-link :to="{ name: 'apps' }" class="console-sidebar__brand">
				<img
					src="/icons/favicon-96x96.png"
					alt=""
					class="console-sidebar__brand-icon"
				/>
				<span>SST Console</span>
			</router-link>
		</template>

		<nav aria-label="Console navigation">
			<AppDrawerItem
				v-for="item in navigation"
				:key="item.label"
				:item="item"
			/>
		</nav>

		<StageContextNavigation />

		<template #footer>
			<LocalSessionControl class="q-mb-sm" />
			<ThemeToggle />
			<ConsoleUserMenu />
		</template>
	</AppDrawer>
</template>

<script setup lang="ts">
import {
	AppDrawer,
	AppDrawerItem,
	type DrawerNavItem
} from "@/components/ui/Drawer";
import { ThemeToggle } from "@/components/ui/theme";
import { useIssues } from "@/composables/issues";
import { computed } from "vue";
import ConsoleUserMenu from "./ConsoleUserMenu.vue";
import LocalSessionControl from "./LocalSessionControl.vue";
import StageContextNavigation from "./StageContextNavigation.vue";

defineProps<{ modelValue: boolean }>();

const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();

const openIssuesQuery = useIssues({ status: "open" });
const navigation = computed<DrawerNavItem[]>(() => {
	const openIssueCount = openIssuesQuery.data.value?.length ?? 0;

	return [
		{ label: "Apps", icon: "sym_r_deployed_code", to: "/apps" },
		{
			label: "Monitoring",
			icon: "sym_r_error",
			to: "/monitoring",
			...(openIssueCount > 0
				? { badge: openIssueCount, badgeColor: "negative" }
				: {})
		},
		{ label: "Accounts", icon: "sym_r_account_balance", to: "/accounts" },
		{ label: "Users", icon: "sym_r_group", to: "/users" },
		{ label: "Operations", icon: "sym_r_build", to: "/operations" }
	];
});
</script>

<style lang="scss" scoped>
.console-sidebar__brand {
	display: inline-flex;
	align-items: center;
	gap: 10px;
	color: var(--q-text-primary);
	font-size: 1rem;
	font-weight: 650;
	letter-spacing: -0.01em;
	text-decoration: none;
}

.console-sidebar__brand-icon {
	width: 24px;
	height: 24px;
}
</style>
