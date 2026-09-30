<template>
	<q-card
		flat
		bordered
		class="column no-wrap full-height"
		:aria-labelledby="titleId"
	>
		<q-card-section
			class="row items-center justify-between q-px-md q-py-sm bg-secondary-2"
		>
			<h3 :id="titleId" class="text-subtitle2 q-my-none">{{ label }}</h3>
			<div class="row items-center q-gutter-xs">
				<q-badge color="primary" class="q-px-sm q-py-xs">JSON</q-badge>
				<q-btn
					v-if="hasValue"
					flat
					dense
					round
					size="sm"
					:icon="copied ? 'sym_r_check' : 'sym_r_content_copy'"
					:aria-label="`Copy ${label.toLowerCase()}`"
					@click="copy"
				/>
			</div>
		</q-card-section>
		<q-separator />
		<q-card-section
			v-if="hasValue"
			class="col column no-wrap overflow-hidden q-pa-none"
		>
			<q-scroll-area class="col q-pa-sm">
				<pre>{{ formattedValue }}</pre>
			</q-scroll-area>
		</q-card-section>
		<q-card-section v-else class="col q-pa-md text-secondary">
			{{ emptyMessage }}
		</q-card-section>
		<span class="sr-only" aria-live="polite">{{
			copied ? `${label} copied` : ""
		}}</span>
	</q-card>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

const props = defineProps<{
	label: string;
	value?: unknown;
	emptyMessage: string;
}>();

const copied = ref(false);
const titleId = `invocation-payload-${props.label.toLowerCase()}`;
const hasValue = computed(() => props.value !== undefined);
const formattedValue = computed(() => JSON.stringify(props.value, null, 2));

async function copy() {
	try {
		await navigator.clipboard.writeText(formattedValue.value);
		copied.value = true;
		window.setTimeout(() => (copied.value = false), 1500);
	} catch {
		copied.value = false;
	}
}
</script>

<style scoped lang="scss">
pre {
	margin: 0;
	font-family: monospace;
	font-size: 0.78rem;
	line-height: 1.5;
	white-space: pre-wrap;
	word-break: break-word;
}

.sr-only {
	clip: rect(0, 0, 0, 0);
	clip-path: inset(50%);
	height: 1px;
	overflow: hidden;
	position: absolute;
	white-space: nowrap;
	width: 1px;
}
</style>
