<template>
	<DialogTrigger>
		<template #trigger="{ open }">
			<slot name="trigger" :open="open" />
		</template>

		<AlertRuleForm v-bind="alert ? { alert } : {}" />
	</DialogTrigger>
</template>

<script setup lang="ts">
import type { AlertRule } from "@sst-console/sdk";

import { DialogTrigger } from "@/components/ui/Dialog";

import AlertRuleForm from "./AlertRuleForm.vue";

defineProps<{ alert?: AlertRule }>();
</script>
