<template>
	<div class="local-stage-workspace column full-height">
		<q-banner dense rounded class="bg-positive text-white">
			<template #avatar><q-icon name="sym_r_terminal" /></template>
			Local SST CLI connected. Showing live function activity from this
			machine.
		</q-banner>
		<div class="row justify-end">
			<q-badge outline color="positive"
				>{{ invocations.length }} retained</q-badge
			>
		</div>
		<div class="local-stage-workspace__content row no-wrap col">
			<LocalInvocationFeed
				class="col-4"
				:invocations="invocations"
				:selected-id="selectedId"
				@select="selectedId = $event"
				@clear="$emit('clear')"
			/>
			<q-separator vertical />
			<div class="col column">
				<q-scroll-area class="col">
					<LocalInvocationDetail :invocation="selectedInvocation" />
				</q-scroll-area>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

import type { LocalInvocation } from "@/composables/local";
import LocalInvocationDetail from "./LocalInvocationDetail.vue";
import LocalInvocationFeed from "./LocalInvocationFeed.vue";

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
.local-stage-workspace {
	gap: 1rem;
	min-height: 0;
}

.local-stage-workspace__content {
	min-height: 0;
}
</style>
