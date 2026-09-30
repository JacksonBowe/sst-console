<template>
	<div v-if="resource" class="resource-details">
		<div class="resource-details__header">
			<div>
				<div class="text-overline text-secondary">{{
					resource.resourceType
				}}</div>
				<div class="text-h6">{{
					resource.name || resource.resourceId
				}}</div>
			</div>
			<q-btn
				v-if="resource.normalizedArn"
				flat
				no-caps
				color="primary"
				icon="sym_r_open_in_new"
				label="Open in AWS Console"
				:href="awsConsoleUrl(resource.normalizedArn)"
				target="_blank"
				rel="noopener noreferrer"
			/>
		</div>

		<dl class="resource-details__fields">
			<div v-if="resource.resourceKind === 'physical'">
				<dt>Resource name</dt>
				<dd>
					<CopyValue
						:value="resourceName(resource)"
						label="resource name"
					/>
				</dd>
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

function awsConsoleUrl(arn: string) {
	return `https://console.aws.amazon.com/go/view?arn=${encodeURIComponent(arn)}`;
}

function resourceName(resource: ResourceTree) {
	const summary = resource.summary;
	if (isRecord(summary)) {
		const field = {
			"sst.aws.Bucket": "bucketName",
			"sst.aws.Dynamo": "tableName",
			"sst.aws.Function": "functionName"
		}[resource.resourceType];
		const value = field ? summary[field] : undefined;
		if (typeof value === "string" && value) return value;
	}

	return resource.name || resource.resourceId;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
</script>

<style scoped lang="scss">
.resource-details {
	display: grid;
	gap: 1.5rem;
	padding: 1.25rem;
}

.resource-details__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
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

@media (max-width: 599px) {
	.resource-details__header {
		align-items: stretch;
		flex-direction: column;
	}
}
</style>
