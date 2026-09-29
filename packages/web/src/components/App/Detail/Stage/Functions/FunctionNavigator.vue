<template>
	<q-card flat bordered>
		<q-list separator>
			<q-item-label header>Functions</q-item-label>
			<q-item v-for="resource in functions" :key="resource.urn">
				<q-item-section avatar>
					<q-icon name="sym_r_functions" color="primary" />
				</q-item-section>
				<q-item-section>
					<q-item-label>{{
						resource.name ?? resource.resourceId
					}}</q-item-label>
				</q-item-section>
			</q-item>
			<q-item v-if="!functions.length">
				<q-item-section class="text-secondary">
					No Function resources found for this stage.
				</q-item-section>
			</q-item>
		</q-list>
	</q-card>
</template>

<script setup lang="ts">
import type { ResourceTree } from "@sst-console/sdk";

defineProps<{ functions: ResourceTree[] }>();
</script>
