<template>
	<pre class="json-preview q-pa-sm rounded-borders">{{ formatted }}</pre>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
	value: unknown;
}>();

const formatted = computed(() => JSON.stringify(props.value, null, 2));
</script>

<style scoped lang="scss">
.json-preview {
	min-height: 100%;
	margin: 0;
	background: color-mix(in srgb, var(--q-dark) 4%, transparent);
	font-size: 11px;
	line-height: 1.45;
	white-space: pre-wrap;
	word-break: break-word;
}

.body--dark .json-preview {
	background: color-mix(in srgb, white 7%, transparent);
}
</style>
