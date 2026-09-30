<template>
	<q-btn
		v-if="hasFacets"
		class="self-stretch"
		label="Clear Filters"
		flat
		no-caps
		@click="clearFacets"
	/>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { hasActiveFilters, type Filters } from ".";

const props = defineProps<{
	filters?: Filters | undefined;
}>();

const emit = defineEmits<{
	clearFacets: [];
}>();

const hasFacets = computed(() =>
	hasActiveFilters(props.filters, { facetsOnly: true })
);

const clearFacets = () => {
	emit("clearFacets");
};
</script>
