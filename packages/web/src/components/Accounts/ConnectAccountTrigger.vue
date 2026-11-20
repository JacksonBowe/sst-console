<template>
	<DialogTrigger>
		<template #trigger="{ open }">
			<q-btn
				unelevated
				no-caps
				color="primary"
				icon="sym_r_add"
				:label="iconOnly ? undefined : 'Connect account'"
				aria-label="Connect account"
				:ripple="false"
				class="fit"
				@click.stop="open"
			/>
		</template>
		<ConnectAccountDialog :quick-create-url="quickCreateUrl" />
	</DialogTrigger>
</template>

<script setup lang="ts">
import { DialogTrigger } from "@/components/ui/Dialog";

import ConnectAccountDialog from "./ConnectAccountDialog.vue";

defineProps<{ iconOnly?: boolean }>();

const quickCreateUrl = import.meta.env.VITE_CONNECTOR_QUICK_CREATE_URL;
</script>
