<template>
	<AppDrawer
		:model-value="modelValue"
		:show-if-above="true"
		:width="264"
		@update:model-value="emit('update:modelValue', $event)"
	>
		<template #brand>
			<router-link :to="{ name: 'apps' }" class="console-sidebar__brand">
				<q-icon name="sym_r_deployed_code" size="sm" />
				<span>SST Console</span>
			</router-link>
		</template>

		<nav aria-label="Console navigation">
			<AppDrawerItem
				v-for="item in navigation"
				:key="item.label"
				:item="item"
				@click="closeOnMobile"
			/>
		</nav>

		<template #footer>
			<div class="row items-center justify-between q-px-sm q-py-xs">
				<span class="text-caption text-secondary">Theme</span>
				<ThemeToggle />
			</div>
			<ConsoleUserMenu />
		</template>
	</AppDrawer>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar";

import { AppDrawer, AppDrawerItem, type DrawerNavItem } from "../Drawer";
import { ThemeToggle } from "../theme";
import ConsoleUserMenu from "./ConsoleUserMenu.vue";

defineProps<{ modelValue: boolean }>();

const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();
const $q = useQuasar();

const navigation: DrawerNavItem[] = [
	{ label: "Apps", icon: "sym_r_deployed_code", to: "/", exact: true },
	{ label: "Accounts", icon: "sym_r_account_balance", to: "/accounts" },
	{ label: "Users", icon: "sym_r_group", to: "/users" },
	{ label: "Operations", icon: "sym_r_build", to: "/operations" }
];

function closeOnMobile(): void {
	if ($q.screen.lt.md) emit("update:modelValue", false);
}
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
</style>
