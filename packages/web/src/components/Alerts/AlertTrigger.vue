<template>
	<DialogTrigger>
		<template #trigger="{ open }">
			<slot name="trigger" :open="open" />
		</template>

		<AlertForm v-bind="alert ? { alert } : {}" />
	</DialogTrigger>
</template>

<script setup lang="ts">
import type { Alert } from "@sst-console/sdk";

import { DialogTrigger } from "@/components/ui/Dialog";

import AlertForm from "./AlertForm.vue";

defineProps<{ alert?: Alert }>();
</script>
