<template>
	<div class="function-invocation-workspace column full-height">
		<div class="function-invocation-workspace__content row no-wrap col">
			<FunctionInvocationFeed
				class="col-4"
				:invocations="invocations"
				:selected-id="selectedId"
				@select="selectedId = $event"
				@clear="$emit('clear')"
			/>
			<q-separator vertical />
			<div class="col column">
				<q-scroll-area class="col">
					<FunctionInvocationDetail
						:invocation="selectedInvocation"
					/>
				</q-scroll-area>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

import type { LocalInvocation } from "@/composables/local";
import FunctionInvocationDetail from "./FunctionInvocationDetail.vue";
import FunctionInvocationFeed from "./FunctionInvocationFeed.vue";

const props = defineProps<{ invocations: LocalInvocation[] }>();
defineEmits<{ clear: [] }>();

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

<style scoped lang="scss">
.function-invocation-workspace {
	gap: 1rem;
	min-height: 0;
}

.function-invocation-workspace__content {
	min-height: 0;
}
</style>
