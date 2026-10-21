<template>
	<DashboardPageHeader :title="title" :subtitle="subtitle" :icon="icon">
		<template #actions>
			<slot name="actions" />
		</template>
	</DashboardPageHeader>
</template>

<script setup lang="ts">
import { DashboardPageHeader } from "@/components/ui/Dashboard";

defineProps<{
	title: string;
	subtitle?: string | undefined;
	icon?: string | undefined;
}>();
</script>
