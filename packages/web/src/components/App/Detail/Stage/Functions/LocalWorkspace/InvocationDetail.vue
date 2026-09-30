<template>
	<q-card v-if="invocation" flat bordered class="column no-wrap full-height">
		<q-card-section class="q-pa-sm bg-secondary-2">
			<InvocationDetailHeader :invocation="invocation" />
		</q-card-section>
		<q-separator />
		<q-card-section class="q-pa-none">
			<q-tabs
				v-model="activePanel"
				align="justify"
				no-caps
				active-color="primary"
				indicator-color="primary"
				class="full-width"
			>
				<q-tab name="overview" label="Overview" :ripple="false" />
				<q-tab name="input" label="Input" :ripple="false" />
				<q-tab name="output" label="Output" :ripple="false" />
				<q-tab name="logs" label="Logs" :ripple="false" />
				<q-tab
					v-if="hasErrors"
					name="errors"
					label="Error"
					:ripple="false"
				/>
			</q-tabs>
		</q-card-section>
		<q-separator />
		<q-card-section class="col column no-wrap overflow-hidden">
			<div v-if="activePanel === 'overview'" class="col column no-wrap">
				<div class="row q-col-gutter-md col-7">
					<div class="col-12 col-sm-6 column">
						<InvocationPayloadPanel
							class="col"
							redact
							label="Input"
							:value="input"
							empty-message="No input captured."
						/>
					</div>
					<div class="col-12 col-sm-6 column">
						<InvocationPayloadPanel
							class="col"
							redact
							label="Output"
							:value="output"
							empty-message="No output captured."
						/>
					</div>
				</div>
				<InvocationLogPanel
					:logs="invocation.logs"
					class="col q-mt-md"
				/>
			</div>
			<InvocationPayloadPanel
				v-else-if="activePanel === 'input'"
				class="col"
				redact
				label="Input"
				:value="input"
				empty-message="No input captured."
			/>
			<InvocationPayloadPanel
				v-else-if="activePanel === 'output'"
				class="col"
				redact
				label="Output"
				:value="output"
				empty-message="No output captured."
			/>
			<InvocationLogPanel
				v-else-if="activePanel === 'logs'"
				class="col"
				:logs="invocation.logs"
			/>
			<InvocationErrorPanel
				v-else
				class="col"
				:errors="invocation.errors"
			/>
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
import { parseJsonBody } from "@/util/json";

const props = defineProps<{ invocation?: LocalInvocation | undefined }>();

type InvocationPanel = "overview" | "input" | "output" | "logs" | "errors";

const activePanel = ref<InvocationPanel>("overview");
const input = computed(() => parseJsonBody(props.invocation?.input));
const output = computed(() => parseJsonBody(props.invocation?.output));
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
