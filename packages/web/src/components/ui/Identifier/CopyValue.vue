<template>
	<div class="copy-value">
		<span class="copy-value__text text-mono" :title="value">{{
			value
		}}</span>
		<q-btn
			flat
			dense
			round
			size="sm"
			:icon="copied ? 'sym_r_check' : 'sym_r_content_copy'"
			:aria-label="`Copy ${label}`"
			@click="copy"
		/>
		<span class="sr-only" aria-live="polite">{{
			copied ? `${label} copied` : ""
		}}</span>
	</div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const props = withDefaults(
	defineProps<{
		label?: string | undefined;
		value: string;
	}>(),
	{ label: "value" }
);

const copied = ref(false);

async function copy() {
	try {
		await navigator.clipboard.writeText(props.value);
		copied.value = true;
		window.setTimeout(() => (copied.value = false), 1500);
	} catch {
		copied.value = false;
	}
}
</script>

<style scoped lang="scss">
.copy-value {
	display: flex;
	align-items: center;
	gap: 0.25rem;
	min-width: 0;
}

.copy-value__text {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
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
