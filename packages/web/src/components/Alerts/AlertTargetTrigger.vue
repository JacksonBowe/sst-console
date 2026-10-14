<template>
	<DialogTrigger full-width>
		<template #trigger="{ open }">
			<slot name="trigger" :open="open" />
		</template>

		<AlertTargetForm v-bind="target ? { target } : {}" />
	</DialogTrigger>
</template>

<script setup lang="ts">
import type { AlertTarget } from "@sst-console/sdk";

import { DialogTrigger } from "@/components/ui/Dialog";

import AlertTargetForm from "./AlertTargetForm.vue";

defineProps<{ target?: AlertTarget }>();
</script>
