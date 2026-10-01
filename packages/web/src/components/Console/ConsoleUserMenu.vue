<template>
	<div class="console-user-menu">
		<div v-if="email" class="console-user-menu__email ellipsis">
			{{ email }}
		</div>
		<AppDrawerItem :item="signOutItem" @click="signOut" dense />
	</div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";

import { queryClient } from "@/boot/vue-query";
import { AppDrawerItem, type DrawerNavItem } from "@/components/ui/Drawer";
import { useAuthStore } from "@/stores/auth";

defineProps<{ email?: string }>();

const auth = useAuthStore();
const router = useRouter();
const signOutItem: DrawerNavItem = {
	label: "Sign out",
	icon: "sym_r_logout"
};

async function signOut(): Promise<void> {
	auth.clearSession();
	queryClient.clear();
	await router.replace({ name: "login" });
}
</script>

<style lang="scss" scoped>
.console-user-menu__email {
	padding: 4px 12px 8px;
	color: var(--q-text-muted);
	font-size: 0.8125rem;
}
</style>
