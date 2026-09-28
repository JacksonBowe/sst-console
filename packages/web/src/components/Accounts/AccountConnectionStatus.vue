<template>
	<q-badge
		class="account-connection-status"
		:color="status === 'connected' ? 'positive' : 'negative'"
	>
		<q-icon :name="icon" size="14px" class="q-mr-xs" />
		{{ label }}
	</q-badge>
</template>

<script setup lang="ts">
import type { AccountStatus } from "@sst-console/sdk";
import { computed } from "vue";

const props = defineProps<{ status: AccountStatus }>();

const label = computed(() =>
	props.status === "connected" ? "Connected" : "Disconnected"
);
const icon = computed(() =>
	props.status === "connected" ? "sym_r_check_circle" : "sym_r_error"
);
</script>

<style scoped lang="scss">
.account-connection-status {
	align-items: center;
	font-weight: 500;
}
</style>
