<template>
	<q-badge :color="color" :label="status" />
</template>

<script setup lang="ts">
import type { IssueStatus } from "@sst-console/sdk";
import { computed } from "vue";

const props = defineProps<{ status: IssueStatus }>();

const color = computed(() =>
	props.status === "open"
		? "negative"
		: props.status === "resolved"
			? "positive"
			: "warning"
);
</script>
