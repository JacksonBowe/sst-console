<template>
	<span class="copy-value">
		<span
			v-if="!copyOnly"
			class="copy-value__text text-mono"
			:title="value"
			>{{ value }}</span
		>
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
	</span>
</template>

<script setup lang="ts">
import { useCopyValue } from "./useCopyValue";

const props = withDefaults(
	defineProps<{
		copyOnly?: boolean | undefined;
		label?: string | undefined;
		value: string;
	}>(),
	{ copyOnly: false, label: "value" }
);

const { copied, copy } = useCopyValue(() => props.value);
</script>

<style scoped lang="scss">
.copy-value {
	display: inline-flex;
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
