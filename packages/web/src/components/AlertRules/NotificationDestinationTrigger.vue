<template>
	<DialogTrigger full-width>
		<template #trigger="{ open }">
			<slot name="trigger" :open="open" />
		</template>

		<NotificationDestinationForm v-bind="target ? { target } : {}" />
	</DialogTrigger>
</template>

<script setup lang="ts">
import type { NotificationDestination } from "@sst-console/sdk";

import { DialogTrigger } from "@/components/ui/Dialog";

import NotificationDestinationForm from "./NotificationDestinationForm.vue";

defineProps<{ target?: NotificationDestination }>();
</script>
