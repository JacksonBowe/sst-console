<template>
	<section
		v-if="visibleErrors.length"
		class="invocation-error-panel bordered rounded-borders"
		aria-labelledby="invocation-errors-title"
	>
		<div class="q-px-md q-py-sm text-negative">
			<h3 id="invocation-errors-title" class="text-subtitle2 q-my-none"
				>Error</h3
			>
		</div>
		<q-separator />
		<div
			v-for="(error, index) in visibleErrors"
			:key="index"
			class="q-pa-md"
		>
			<div class="row items-start justify-between q-gutter-sm">
				<div v-if="error.error" class="text-weight-medium">{{
					error.error
				}}</div>
				<q-btn
					flat
					dense
					round
					size="sm"
					icon="sym_r_content_copy"
					:aria-label="`Copy error ${index + 1}`"
					@click="copy(error)"
				/>
			</div>
			<div v-if="error.message" class="q-mt-xs">{{ error.message }}</div>
			<pre v-if="error.stack.length" class="q-mt-sm">{{
				error.stack.join("\n")
			}}</pre>
		</div>
	</section>
</template>

<script setup lang="ts">
import { computed } from "vue";

type InvocationError = {
	error?: string | undefined;
	message?: string | undefined;
	stack: string[];
};

const props = defineProps<{ errors: InvocationError[] }>();
const visibleErrors = computed(() =>
	props.errors.filter(
		error => error.error || error.message || error.stack.length
	)
);

async function copy(error: InvocationError) {
	const text = [error.error, error.message, error.stack.join("\n")]
		.filter(Boolean)
		.join("\n");
	try {
		await navigator.clipboard.writeText(text);
	} catch {
		// Text remains selectable when clipboard access is unavailable.
	}
}
</script>

<style scoped lang="scss">
.invocation-error-panel {
	border-color: color-mix(
		in srgb,
		var(--q-negative) 45%,
		var(--q-secondary-2)
	);
}

.invocation-error-panel > div + div {
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
</style>
