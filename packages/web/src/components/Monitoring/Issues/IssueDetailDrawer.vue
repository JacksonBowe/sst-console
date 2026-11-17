<template>
	<q-dialog
		:model-value="modelValue"
		position="right"
		maximized
		@update:model-value="$emit('update:modelValue', $event)"
	>
		<q-card class="column no-wrap overflow-hidden">
			<div class="row justify-end q-pa-sm">
				<q-btn
					flat
					round
					dense
					icon="sym_r_close"
					aria-label="Close issue details"
					v-close-popup
				/>
			</div>
			<IssueDetailPanel
				class="col"
				:issue="issue"
				@status="$emit('status', $event)"
			/>
		</q-card>
	</q-dialog>
</template>

<script setup lang="ts">
import type { Issue, IssueStatus } from "@sst-console/sdk";
import IssueDetailPanel from "./IssueDetailPanel.vue";
defineProps<{ modelValue: boolean; issue?: Issue | undefined }>();
defineEmits<{
	"update:modelValue": [value: boolean];
	status: [status: IssueStatus];
}>();
</script>
