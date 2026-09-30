<template>
	<q-card
		v-if="visibleErrors.length"
		class="invocation-error-panel column no-wrap overflow-hidden"
		aria-labelledby="invocation-errors-title"
	>
		<q-card-section
			class="row items-center justify-between q-px-md q-py-sm bg-secondary-2"
		>
			<h3
				id="invocation-errors-title"
				class="text-subtitle2 q-my-none text-negative"
			>
				Error
			</h3>
			<q-btn
				flat
				dense
				round
				size="sm"
				:icon="copied ? 'sym_r_check' : 'sym_r_content_copy'"
				aria-label="Copy errors"
				@click="copy"
			/>
		</q-card-section>
		<q-separator />
		<q-card-section
			v-for="(error, index) in visibleErrors"
			:key="index"
			class="q-pa-md"
		>
			<div v-if="error.error" class="text-weight-medium">
				{{ error.error }}
			</div>
			<div v-if="error.message" class="q-mt-xs">{{ error.message }}</div>
			<pre v-if="error.stack.length" class="q-mt-sm">{{
				error.stack.join("\n")
			}}</pre>
		</q-card-section>
		<span class="sr-only" aria-live="polite">{{
			copied ? "Errors copied" : ""
		}}</span>
	</q-card>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

type InvocationError = {
	error?: string | undefined;
	message?: string | undefined;
	stack: string[];
};

const props = defineProps<{ errors: InvocationError[] }>();
const copied = ref(false);
const visibleErrors = computed(() =>
	props.errors.filter(
		error => error.error || error.message || error.stack.length
	)
);

async function copy() {
	const text = visibleErrors.value
		.map(error => [error.error, error.message, error.stack.join("\n")])
		.map(parts => parts.filter(Boolean).join("\n"))
		.join("\n\n");
	try {
		await navigator.clipboard.writeText(text);
		copied.value = true;
		window.setTimeout(() => (copied.value = false), 1500);
	} catch {
		copied.value = false;
	}
}
</script>

<style scoped lang="scss">
.invocation-error-panel :deep(.q-card__section + .q-card__section) {
	border-top: 1px solid color-mix(in srgb, var(--q-negative) 20%, transparent);
}

pre {
	max-height: 14rem;
	margin-bottom: 0;
	overflow: auto;
	padding: 0.75rem;
	background: color-mix(in srgb, var(--q-negative) 10%, transparent);
	border-radius: 4px;
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
