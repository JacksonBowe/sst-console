<template>
	<div v-if="resource" class="resource-details">
		<div>
			<div class="text-overline text-secondary">{{
				resource.resourceType
			}}</div>
			<div class="text-h6">{{
				resource.name || resource.resourceId
			}}</div>
		</div>

		<dl class="resource-details__fields">
			<div>
				<dt>Kind</dt>
				<dd>{{ resource.resourceKind }}</dd>
			</div>
			<div>
				<dt>Resource ID</dt>
				<dd
					><CopyValue
						:value="resource.resourceId"
						label="resource ID"
				/></dd>
			</div>
			<div v-if="resource.normalizedArn">
				<dt>ARN</dt>
				<dd
					><CopyValue :value="resource.normalizedArn" label="ARN"
				/></dd>
			</div>
			<div>
				<dt>URN</dt>
				<dd><CopyValue :value="resource.urn" label="URN" /></dd>
			</div>
		</dl>
	</div>

	<div
		v-else
		class="column flex-center full-height text-center q-pa-xl text-secondary"
	>
		<q-icon name="sym_r_account_tree" size="40px" class="q-mb-sm" />
		<div>Select a resource to inspect details.</div>
	</div>
</template>

<script setup lang="ts">
import type { ResourceTree } from "@sst-console/sdk";

import { CopyValue } from "@/components/ui/Identifier";

defineProps<{ resource?: ResourceTree | undefined }>();
</script>

<style scoped lang="scss">
.resource-details {
	display: grid;
	gap: 1.5rem;
	padding: 1.25rem;
}

.resource-details__fields {
	display: grid;
	gap: 1rem;
	margin: 0;
}

.resource-details__fields dt {
	color: var(--q-text-secondary);
	font-size: 0.75rem;
	margin-bottom: 0.25rem;
}

.resource-details__fields dd {
	margin: 0;
	min-width: 0;
}
</style>
