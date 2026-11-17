<template>
	<q-card
		v-if="issue"
		flat
		bordered
		class="issue-detail-panel column no-wrap"
	>
		<q-card-section class="row items-start q-pb-sm">
			<div class="col issue-detail-panel__heading">
				<div class="text-h6 text-weight-bold">{{
					issue.errorType
				}}</div>
			</div>
			<IssueStatusChip :status="issue.status" />
		</q-card-section>
		<q-card-section class="q-pt-none issue-detail-panel__summary">
			<div class="row no-wrap issue-detail-panel__actions">
				<q-btn
					outline
					dense
					no-caps
					color="primary"
					class="col"
					label="Go to stage"
					:title="`${issue.appName} / ${issue.stageName}`"
					icon-right="sym_r_open_in_new"
					:to="stageRoute"
				/>
				<q-btn
					v-if="issue.status === 'open'"
					outline
					dense
					no-caps
					class="col"
					icon="sym_r_check"
					label="Resolve"
					@click="$emit('status', 'resolved')"
				/>
				<q-btn
					v-if="issue.status !== 'open'"
					outline
					dense
					no-caps
					class="col"
					icon="sym_r_replay"
					label="Reopen"
					@click="$emit('status', 'open')"
				/>
				<q-btn
					v-if="issue.status !== 'suppressed'"
					outline
					dense
					no-caps
					class="col"
					icon="sym_r_notifications_off"
					label="Suppress"
					@click="$emit('status', 'suppressed')"
				/>
			</div>
			<div
				class="row items-center text-caption text-secondary issue-detail-panel__metrics"
			>
				<span tabindex="0"
					>First seen {{ relativeTime(issue.firstSeenAt)
					}}<q-tooltip>{{
						formatDateTime(issue.firstSeenAt)
					}}</q-tooltip></span
				>
				<span tabindex="0"
					>Last seen {{ relativeTime(issue.lastSeenAt)
					}}<q-tooltip>{{
						formatDateTime(issue.lastSeenAt)
					}}</q-tooltip></span
				>
				<span
					>{{ issue.count }}
					{{ issue.count === 1 ? "occurrence" : "occurrences" }}</span
				>
			</div>
		</q-card-section>
		<q-separator />
		<q-card-section class="issue-detail-panel__body overflow-auto">
			<div>
				<div class="row items-center justify-between q-mb-xs">
					<div class="text-subtitle2">Error message</div>
					<q-btn
						flat
						dense
						round
						:icon="
							messageCopied ? 'sym_r_check' : 'sym_r_content_copy'
						"
						:aria-label="
							messageCopied
								? 'Error message copied'
								: 'Copy error message'
						"
						@click="copyMessage"
					/>
				</div>
				<CodePreview
					:key="`${issue.appName}/${issue.stageName}/${issue.fingerprint}`"
					:code="issue.errorMessage"
					label="Full error message"
					mode="content"
				/>
			</div>
			<div
				v-if="issue.stack && !issue.errorMessage.includes(issue.stack)"
			>
				<div class="row items-center justify-between q-mb-xs">
					<div class="text-subtitle2">Stack trace</div>
					<q-btn
						flat
						dense
						round
						:icon="
							stackCopied ? 'sym_r_check' : 'sym_r_content_copy'
						"
						:aria-label="
							stackCopied
								? 'Stack trace copied'
								: 'Copy stack trace'
						"
						@click="copyStack"
					/>
				</div>
				<CodePreview
					:code="issue.stack"
					label="Stack trace"
					mode="content"
				/>
			</div>
			<q-expansion-item
				icon="sym_r_info"
				label="Technical details"
				class="rounded-borders bg-secondary-2 overflow-hidden"
			>
				<div
					class="q-px-md q-pb-md text-body2 issue-detail-panel__metadata"
				>
					<div
						v-for="field in technicalDetails"
						:key="field.label"
						class="issue-detail-panel__metadata-row q-py-sm"
					>
						<div class="text-caption text-secondary">{{
							field.label
						}}</div>
						<CopyValue
							:value="field.value"
							:label="field.label"
							wrap
						/>
					</div>
				</div>
			</q-expansion-item>
		</q-card-section>
	</q-card>
	<q-card
		v-else
		flat
		bordered
		class="column flex-center q-pa-xl text-secondary"
	>
		Select an issue to inspect full details.
	</q-card>
</template>

<script setup lang="ts">
import type { Issue, IssueStatus } from "@sst-console/sdk";
import { computed } from "vue";

import { formatDateTime, relativeTime } from "@/components/ui/format";
import { useCopyValue } from "@/components/ui/Identifier/useCopyValue";
import { CopyValue } from "@/components/ui/Identifier";
import { errorNotify } from "@/components/ui/toast";
import CodePreview from "@/components/ui/CodePreview/CodePreview.vue";
import IssueStatusChip from "./IssueStatusChip.vue";

const props = defineProps<{ issue?: Issue | undefined }>();
defineEmits<{ status: [status: IssueStatus] }>();
const { copied: messageCopied, copy: copyMessageValue } = useCopyValue(
	() => props.issue?.errorMessage ?? ""
);
const { copied: stackCopied, copy: copyStackValue } = useCopyValue(
	() => props.issue?.stack ?? ""
);
async function copyMessage() {
	if (!(await copyMessageValue()))
		errorNotify("Unable to copy error message");
}
async function copyStack() {
	if (!(await copyStackValue())) errorNotify("Unable to copy stack trace");
}

const workload = computed(
	() => props.issue?.functionName ?? props.issue?.logGroup ?? "Unavailable"
);
const technicalDetails = computed(() => {
	if (!props.issue) return [];
	return [
		{ label: "Account ID", value: props.issue.accountId },
		{ label: "Region", value: props.issue.region },
		{ label: "Workload", value: workload.value },
		...(props.issue.functionArn
			? [{ label: "Function ARN", value: props.issue.functionArn }]
			: []),
		{ label: "Log group", value: props.issue.logGroup },
		{ label: "Log stream", value: props.issue.logStream }
	];
});
const stageRoute = computed(() => ({
	name: "stage-detail",
	params: { appName: props.issue?.appName, stageName: props.issue?.stageName }
}));
</script>

<style scoped lang="scss">
.issue-detail-panel {
	min-width: 0;
}
.issue-detail-panel__heading {
	min-width: 0;
}
.issue-detail-panel__summary,
.issue-detail-panel__body {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}
.issue-detail-panel__body {
	flex: 1 1 0;
	min-height: 0;
}
.issue-detail-panel__body > * {
	flex-shrink: 0;
}
.issue-detail-panel__summary {
	gap: 0.5rem;
}
.issue-detail-panel__actions {
	gap: 0.5rem;
}
.issue-detail-panel__actions > * {
	min-width: 0;
}
.issue-detail-panel__metrics {
	gap: 0.25rem 0.75rem;
}
.issue-detail-panel__metadata {
	overflow-wrap: anywhere;
}
.issue-detail-panel__metadata-row + .issue-detail-panel__metadata-row {
	border-top: 1px solid var(--q-border);
}
.issue-detail-panel :deep(.code-preview) {
	border: 1px solid var(--q-border);
	border-radius: 6px;
}
</style>
