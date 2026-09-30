<template>
	<q-card v-if="invocation" flat bordered class="invocation-detail">
		<q-card-section>
			<InvocationDetailHeader :invocation="invocation" />
		</q-card-section>
		<q-tabs
			v-model="activePanel"
			align="left"
			dense
			no-caps
			active-color="primary"
			indicator-color="primary"
			class="invocation-detail__tabs"
		>
			<q-tab name="overview" label="Overview" />
			<q-tab name="input" label="Input" />
			<q-tab name="output" label="Output" />
			<q-tab name="logs" label="Logs" />
			<q-tab v-if="hasErrors" name="errors" label="Error" />
		</q-tabs>
		<q-separator />
		<q-card-section class="invocation-detail__panel">
			<template v-if="activePanel === 'overview'">
				<div class="invocation-detail__payloads">
					<InvocationPayloadPanel
						label="Input"
						:value="invocation.input"
						empty-message="No input captured."
					/>
					<InvocationPayloadPanel
						label="Output"
						:value="invocation.output"
						empty-message="No output captured."
					/>
				</div>
				<InvocationLogPanel :logs="invocation.logs" class="q-mt-md" />
			</template>
			<InvocationPayloadPanel
				v-else-if="activePanel === 'input'"
				label="Input"
				:value="invocation.input"
				empty-message="No input captured."
			/>
			<InvocationPayloadPanel
				v-else-if="activePanel === 'output'"
				label="Output"
				:value="invocation.output"
				empty-message="No output captured."
			/>
			<InvocationLogPanel
				v-else-if="activePanel === 'logs'"
				:logs="invocation.logs"
			/>
			<InvocationErrorPanel v-else :errors="invocation.errors" />
		</q-card-section>
	</q-card>
	<div
		v-else
		class="column flex-center full-height q-pa-xl text-center text-secondary"
	>
		<q-icon name="sym_r_terminal" size="44px" class="q-mb-sm" />
		<div class="text-subtitle1">Select an invocation</div>
		<div class="text-body2">
			Local requests, logs, responses, and errors appear here.
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

import type { LocalInvocation } from "@/composables/local";
import InvocationDetailHeader from "./InvocationDetailHeader.vue";
import InvocationErrorPanel from "./InvocationErrorPanel.vue";
import InvocationLogPanel from "./InvocationLogPanel.vue";
import InvocationPayloadPanel from "./InvocationPayloadPanel.vue";

const props = defineProps<{ invocation?: LocalInvocation | undefined }>();

const activePanel = ref("overview");
const hasErrors = computed(() =>
	props.invocation?.errors.some(
		error => error.error || error.message || error.stack.length
	)
);

watch(
	() => props.invocation?.id,
	() => (activePanel.value = "overview")
);
</script>

<style scoped lang="scss">
.invocation-detail__tabs {
	padding: 0 0.5rem;
}

.invocation-detail__payloads {
	display: grid;
	gap: 1rem;
	grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (max-width: 700px) {
	.invocation-detail__payloads {
		grid-template-columns: 1fr;
	}
}
</style>
