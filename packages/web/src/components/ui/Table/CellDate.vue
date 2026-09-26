<template>
	{{ formatDate(dateValue) }}
</template>

<script setup lang="ts">
import { computed } from "vue";
import { formatDate } from "../format";

const props = defineProps<{
	/** QTable cell props */
	props: {
		row: Record<string, unknown>;
		col: {
			name: string;
			field: string | ((row: Record<string, unknown>) => unknown);
		};
		value: unknown;
	};
	/** Optional field name to use instead of col.field */
	field?: string;
}>();

const dateValue = computed(() => {
	if (props.field) {
		return props.props.row[props.field] as string;
	}
	return props.props.value as string;
});
</script>
