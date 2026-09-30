<template>
	<div class="column full-height overflow-hidden">
		<div class="row no-wrap col overflow-hidden q-col-gutter-md">
			<div class="col-4">
				<InvocationList
					:invocations="invocations"
					:status="status"
					:selected-id="selectedId"
					@select="selectedId = $event"
				/>
			</div>

			<div class="col-8">
				<InvocationDetail
					:invocation="selectedInvocation"
					class="fit"
				/>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

import type {
	LocalConnectionStatus,
	LocalInvocation
} from "@/composables/local";
import InvocationDetail from "./InvocationDetail.vue";
import InvocationList from "./InvocationList.vue";

const props = defineProps<{
	invocations: LocalInvocation[];
	status: LocalConnectionStatus;
}>();

const selectedId = ref<string>();
const selectedInvocation = computed(() =>
	props.invocations.find(invocation => invocation.id === selectedId.value)
);

watch(
	() => props.invocations,
	invocations => {
		if (!selectedId.value && invocations[0])
			selectedId.value = invocations[0].id;
		if (
			selectedId.value &&
			!invocations.some(invocation => invocation.id === selectedId.value)
		)
			selectedId.value = invocations[0]?.id;
	},
	{ immediate: true }
);
</script>
