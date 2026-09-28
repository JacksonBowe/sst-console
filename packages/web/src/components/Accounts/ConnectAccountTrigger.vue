<template>
	<DialogTrigger>
		<template #trigger="{ open }">
			<slot name="trigger" :open="open" />
		</template>

		<ConnectAccountDialog :quick-create-url="quickCreateUrl" />
	</DialogTrigger>
</template>

<script setup lang="ts">
import { DialogTrigger } from "@/components/ui/Dialog";

import ConnectAccountDialog from "./ConnectAccountDialog.vue";

const quickCreateUrl = import.meta.env.VITE_CONNECTOR_QUICK_CREATE_URL;
</script>
