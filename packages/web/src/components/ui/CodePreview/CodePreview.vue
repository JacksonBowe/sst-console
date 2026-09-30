<template>
	<q-scroll-area
		class="code-preview"
		:style="{ backgroundColor: codeBackground }"
		:aria-label="label"
		role="region"
	>
		<div v-html="highlightedCode" />
	</q-scroll-area>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { useTheme } from "@/composables/theme";
import {
	highlightCode,
	type CodeLanguage
} from "@/components/ui/CodePreview/highlight";

const props = withDefaults(
	defineProps<{
		code: string;
		language?: CodeLanguage;
		label?: string;
	}>(),
	{ label: "Code preview" }
);

const { dark } = useTheme();
const codeBackground = computed(() => (dark.value ? "#0d1117" : "#ffffff"));
const highlightedCode = ref(toPlainTextHtml(props.code));
let requestId = 0;

watch(
	[() => props.code, () => props.language, dark],
	async ([code, language, isDark]) => {
		const currentRequestId = ++requestId;
		highlightedCode.value = toPlainTextHtml(code);

		if (!language) return;

		try {
			const html = await highlightCode(code, language, isDark);
			if (currentRequestId === requestId) highlightedCode.value = html;
		} catch {
			// Unsupported languages remain readable as plain text.
		}
	},
	{ immediate: true }
);

function toPlainTextHtml(code: string): string {
	return `<pre><code>${escapeHtml(code)}</code></pre>`;
}

function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, character => {
		return (
			{
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				'"': "&quot;",
				"'": "&#39;"
			}[character] ?? character
		);
	});
}
</script>

<style scoped lang="scss">
.code-preview {
	font-family: monospace;
	font-size: 0.78rem;
	line-height: 1.5;
}

.code-preview :deep(pre) {
	min-height: 100%;
	margin: 0;
	padding: 0.5rem;
	white-space: pre-wrap;
	word-break: break-word;
}

.code-preview :deep(code) {
	font-family: inherit;
}
</style>
