<template>
	<q-card flat bordered class="issue-list column col overflow-hidden">
		<IssuesListErrorState v-if="error" @retry="$emit('retry')" />
		<div v-else-if="loading" class="text-center q-pa-lg">
			<q-spinner color="primary" size="2em" />
			<div>Loading issues</div>
		</div>
		<div
			v-else-if="issues.length === 0"
			class="text-center text-secondary q-pa-lg"
		>
			{{
				filtered
					? "No issues match these filters"
					: "No issues detected"
			}}
		</div>
		<q-list
			v-else
			separator
			class="issue-list__rows q--avoid-card-border scroll"
			aria-label="Issues"
		>
			<q-item
				v-for="(issue, index) in issues"
				:key="`${issue.appName}/${issue.stageName}/${issue.fingerprint}/${index}`"
				clickable
				tag="button"
				class="issue-list__button full-width text-left"
				:class="{ 'issue-list__selected': isSelected(issue) }"
				:aria-pressed="isSelected(issue)"
				@click="$emit('select', issue)"
			>
				<q-item-section avatar top>
					<q-icon
						:name="statusIcon(issue.status)"
						:color="statusColor(issue.status)"
						size="sm"
					/>
				</q-item-section>
				<q-item-section class="issue-list__content">
					<div class="row no-wrap items-center q-gutter-sm">
						<div class="text-weight-bold ellipsis col">{{
							issue.errorType
						}}</div>
						<IssueStatusChip :status="issue.status" />
					</div>
					<div class="ellipsis text-body2">{{
						issue.errorMessage
					}}</div>
					<div class="text-caption text-secondary ellipsis"
						>{{ issue.appName }} / {{ issue.stageName }}</div
					>
					<div
						class="row no-wrap justify-between q-gutter-x-sm text-caption text-secondary"
					>
						<span :aria-label="`${issue.count} occurrences`"
							><q-icon name="sym_r_bar_chart" />
							{{ issue.count }}</span
						>
						<span class="ellipsis"
							><q-icon name="sym_r_schedule" />
							{{ formatDateTime(issue.lastSeenAt) }}</span
						>
					</div>
				</q-item-section>
			</q-item>
			<q-separator />
		</q-list>
	</q-card>
</template>

<script setup lang="ts">
import type { Issue, IssueStatus } from "@sst-console/sdk";
import IssueStatusChip from "./IssueStatusChip.vue";
import IssuesListErrorState from "./IssuesListErrorState.vue";
import { formatDateTime } from "@/components/ui/format";

const props = defineProps<{
	issues: Issue[];
	selected?: Issue | undefined;
	loading: boolean;
	error: boolean;
	filtered: boolean;
}>();
defineEmits<{ select: [issue: Issue]; retry: [] }>();
const isSelected = (issue: Issue) => {
	return (
		props.selected?.fingerprint === issue.fingerprint &&
		props.selected?.appName === issue.appName &&
		props.selected?.stageName === issue.stageName
	);
};
const statusIcon = (status: IssueStatus) => {
	return status === "open"
		? "sym_r_error"
		: status === "resolved"
			? "sym_r_check_circle"
			: "sym_r_notifications_off";
};
const statusColor = (status: IssueStatus) => {
	return status === "open"
		? "negative"
		: status === "resolved"
			? "positive"
			: "warning";
};
</script>

<style scoped>
.issue-list {
	min-height: 0;
}
.issue-list__rows {
	min-height: 0;
}
.issue-list__button {
	appearance: none;
	border: 0;
	background: transparent;
	color: inherit;
	font: inherit;
}
.issue-list__button:focus-visible {
	outline: 2px solid var(--q-primary);
	outline-offset: -2px;
}
.issue-list__button :deep(.q-item__section--avatar) {
	min-width: 38px;
	padding-right: 12px;
}
.issue-list__content {
	min-width: 0;
	width: 0;
	flex: 1 1 0%;
	overflow: hidden;
}
.issue-list__content > * {
	max-width: 100%;
}
.issue-list__selected {
	background: var(--q-primary-3);
}
</style>
