<template>
	<q-btn
		flat
		dense
		round
		icon="sym_r_more_vert"
		:aria-label="`Actions for ${user.email}`"
	>
		<q-menu
			class="user-actions-menu"
			anchor="center left"
			self="center right"
			:offset="[8, 0]"
		>
			<q-list class="q-pa-sm">
				<q-item
					v-if="user.cognitoStatus === 'FORCE_CHANGE_PASSWORD'"
					class="user-actions-menu__item q-px-sm q-py-xs"
					clickable
					dense
					v-close-popup
					@click="invite.mutate({ email: user.email })"
				>
					<q-item-section>Resend invitation</q-item-section>
				</q-item>
				<q-item
					class="user-actions-menu__item q-px-sm q-py-xs"
					clickable
					dense
					v-close-popup
					@click="changeEnabled(!user.cognitoEnabled)"
				>
					<q-item-section>{{
						user.cognitoEnabled ? "Disable" : "Enable"
					}}</q-item-section>
				</q-item>
				<q-item
					class="user-actions-menu__item q-px-sm q-py-xs"
					clickable
					dense
					v-close-popup
					@click="confirmDelete"
				>
					<q-item-section class="text-negative"
						>Delete</q-item-section
					>
				</q-item>
			</q-list>
		</q-menu>
	</q-btn>
</template>

<script setup lang="ts">
import type { User } from "@sst-console/sdk";
import { Dialog } from "quasar";
import { DialogConfirm } from "@/components/ui/Dialog";
import {
	useRemoveUser,
	useInviteUser,
	useSetUserEnabled
} from "@/composables/users";

const props = defineProps<{ user: User }>();
const remove = useRemoveUser();
const invite = useInviteUser();
const setEnabled = useSetUserEnabled();
function changeEnabled(enabled: boolean) {
	setEnabled.mutate({ id: props.user.id, enabled });
}
function confirmDelete() {
	Dialog.create({
		component: DialogConfirm,
		componentProps: {
			title: "Delete user",
			message: `Permanently delete ${props.user.email}?`,
			variant: "negative",
			destructive: true,
			confirmLabel: "Delete",
			perform: () => remove.mutateAsync(props.user.id)
		}
	});
}
</script>

<style scoped lang="scss">
.user-actions-menu {
	background: var(--q-page);
	color: var(--q-text-primary);
	border: 1px solid var(--q-border);
	border-radius: $generic-border-radius;
	box-shadow: 0 8px 24px
		color-mix(in srgb, var(--q-text-primary) 12%, transparent);
}

.user-actions-menu__item {
	border-radius: $generic-border-radius;

	&:hover {
		background: var(--q-secondary-3);
	}
}
</style>
