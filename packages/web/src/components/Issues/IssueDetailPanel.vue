<template>
	<q-card
		v-if="issue"
		flat
		bordered
		class="issue-detail-panel column no-wrap"
	>
		<q-card-section class="row items-start q-pb-sm">
			<div class="col">
				<div class="text-overline text-secondary">{{
					issue.errorType
				}}</div>
				<div class="text-subtitle1 text-weight-medium">{{
					issue.errorMessage
				}}</div>
			</div>
			<IssueStatusChip :status="issue.status" />
		</q-card-section>
		<q-card-section class="q-pt-none q-gutter-sm">
			<div class="row q-col-gutter-md text-body2">
				<div class="col-6"
					><span class="text-secondary">First seen</span><br />{{
						formatDateTime(issue.firstSeenAt)
					}}</div
				>
				<div class="col-6"
					><span class="text-secondary">Last seen</span><br />{{
						formatDateTime(issue.lastSeenAt)
					}}</div
				>
				<div class="col-6"
					><span class="text-secondary">Occurrences</span><br />{{
						issue.count
					}}</div
				>
				<div class="col-6"
					><span class="text-secondary">Workload</span><br />{{
						workload
					}}</div
				>
			</div>
			<div class="row q-gutter-sm">
				<q-btn
					flat
					dense
					no-caps
					color="primary"
					label="Open stage"
					:to="stageRoute"
				/>
				<q-btn
					v-if="issue.status === 'open'"
					flat
					dense
					no-caps
					color="primary"
					label="Resolve"
					@click="$emit('status', 'resolved')"
				/>
				<q-btn
					flat
					dense
					round
					icon="sym_r_more_horiz"
					aria-label="More issue actions"
				>
					<q-menu>
						<q-list dense style="min-width: 10rem">
							<q-item
								v-for="action in otherActions"
								:key="action.status"
								v-close-popup
								clickable
								@click="$emit('status', action.status)"
							>
								<q-item-section>{{
									action.label
								}}</q-item-section>
							</q-item>
						</q-list>
					</q-menu>
				</q-btn>
			</div>
		</q-card-section>
		<q-separator />
		<q-card-section class="q-gutter-md overflow-auto">
			<div>
				<div class="text-subtitle2 q-mb-xs">Error message</div>
				<CodePreview
					:code="issue.errorMessage"
					label="Full error message"
					mode="content"
				/>
			</div>
			<div v-if="issue.stack">
				<div class="text-subtitle2 q-mb-xs">Stack trace</div>
				<CodePreview
					:code="issue.stack"
					label="Stack trace"
					mode="content"
				/>
			</div>
			<div class="text-caption text-secondary"
				>Latest occurrence: {{ issue.logGroup }} ·
				{{ issue.logStream }}</div
			>
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

import { formatDateTime } from "@/components/ui/format";
import CodePreview from "@/components/ui/CodePreview/CodePreview.vue";
import IssueStatusChip from "./IssueStatusChip.vue";

const props = defineProps<{ issue?: Issue | undefined }>();
defineEmits<{ status: [status: IssueStatus] }>();

const workload = computed(
	() => props.issue?.functionName ?? props.issue?.logGroup ?? "Unavailable"
);
const stageRoute = computed(() => ({
	name: "stage-detail",
	params: { appName: props.issue?.appName, stageName: props.issue?.stageName }
}));
const otherActions = computed(() => {
	if (!props.issue) return [];
	if (props.issue.status === "open")
		return [{ status: "suppressed" as const, label: "Suppress" }];
	return [
		{ status: "open" as const, label: "Reopen" },
		...(props.issue.status === "resolved"
			? [{ status: "suppressed" as const, label: "Suppress" }]
			: [])
	];
});
</script>

<style scoped lang="scss">
.issue-detail-panel {
	min-height: 28rem;
}
</style>
