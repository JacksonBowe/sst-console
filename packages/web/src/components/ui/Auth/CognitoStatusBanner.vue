<template>
	<q-banner v-if="status" rounded :class="bannerClass">
		<div class="row items-center no-wrap q-gutter-x-sm">
			<q-icon :name="icon" size="20px" />
			<div class="text-body2 text-weight-medium">{{
				status.message
			}}</div>
		</div>
	</q-banner>
</template>

<script setup lang="ts">
import { computed } from "vue";

import type { CognitoAuthStatus } from "./types";

const props = defineProps<{
	status: CognitoAuthStatus | null;
}>();

const bannerClass = computed(() => {
	if (props.status?.tone === "negative") {
		return "bg-red-1 text-negative";
	}

	if (props.status?.tone === "positive") {
		return "bg-green-1 text-positive";
	}

	return "bg-blue-1 text-info";
});

const icon = computed(() => {
	if (props.status?.tone === "negative") {
		return "sym_r_error_outline";
	}

	if (props.status?.tone === "positive") {
		return "sym_r_check_circle_outline";
	}

	return "sym_r_info_outline";
});
</script>
