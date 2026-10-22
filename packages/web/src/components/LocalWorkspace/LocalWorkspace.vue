<template>
	<div class="column full-height q-gap-md">
		<LocalActivityToolbar
			:filters="filters"
			:function-options="functionOptions"
			:is-streaming="isStreaming"
			@update:filters="updateFilters"
			@toggle-stream="$emit('toggle-stream')"
			@clear="$emit('clear')"
		/>
		<div class="row no-wrap col overflow-hidden q-col-gutter-md">
			<div class="col-4">
				<InvocationList
					:invocations="invocations"
					:status="status"
					:selected-id="selectedId"
					:filters="filters"
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
import { computed, reactive, ref, watch } from "vue";

import type { Filters } from "@/components/ui/Table";
import type {
	LocalConnectionStatus,
	LocalInvocation
} from "@/composables/local";
import InvocationDetail from "./InvocationDetail.vue";
import InvocationList from "./InvocationList.vue";
import LocalActivityToolbar from "./LocalActivityToolbar.vue";
import { filterInvocations } from "./invocation-filters";

const props = withDefaults(
	defineProps<{
		invocations: LocalInvocation[];
		status: LocalConnectionStatus;
		functionOptions?: Array<{ label: string; value: string }>;
		isStreaming?: boolean;
	}>(),
	{ functionOptions: () => [], isStreaming: true }
);
defineEmits<{ clear: []; "toggle-stream": [] }>();

const selectedId = ref<string>();
const filters = reactive<Filters>({
	text: "",
	facets: { status: [], function: [] }
});
const filteredInvocations = computed(() =>
	filterInvocations(props.invocations, filters)
);
const selectedInvocation = computed(() =>
	props.invocations.find(invocation => invocation.id === selectedId.value)
);

function updateFilters(next: Filters) {
	Object.assign(filters, next);
}

watch(
	filteredInvocations,
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
