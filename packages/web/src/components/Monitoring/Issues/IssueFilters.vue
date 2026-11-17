<template>
	<div
		class="issue-filters column"
		:class="{ 'issue-filters--desktop': displayMode === 'desktop' }"
	>
		<div
			v-if="displayMode === 'desktop'"
			class="text-subtitle1 text-weight-bold"
			>Filters</div
		>
		<div>
			<q-list v-if="displayMode === 'desktop'" class="q-gutter-y-xs">
				<q-item
					v-for="option in queueOptions"
					:key="option.value"
					clickable
					dense
					class="rounded-borders"
					:active="isActive(option.value)"
					active-class="issue-filters__active"
					:aria-pressed="isActive(option.value)"
					role="button"
					@click="
						update('status', option.value ? [option.value] : [])
					"
				>
					<q-item-section avatar
						><q-icon :name="option.icon" size="xs"
					/></q-item-section>
					<q-item-section>{{ option.label }}</q-item-section>
					<q-item-section side>{{
						option.value
							? counts[option.value]
							: scopedIssues.length
					}}</q-item-section>
				</q-item>
			</q-list>
			<div v-else class="text-weight-medium q-mb-xs">Status</div>
			<q-btn-toggle
				v-if="displayMode === 'mobile'"
				:model-value="filters.facets.status?.[0] ?? ''"
				:options="statusOptions"
				spread
				dense
				no-caps
				unelevated
				color="secondary-2"
				toggle-color="primary"
				toggle-text-color="on-primary"
				aria-label="Status"
				@update:model-value="update('status', $event ? [$event] : [])"
			/>
		</div>
		<q-separator v-if="displayMode === 'desktop'" />
		<div class="text-weight-medium">App</div>
		<SSelect
			:model-value="filters.facets.appName ?? []"
			:options="appOptions"
			aria-label="App"
			:display-value="
				(filters.facets.appName ?? []).length ? undefined : 'All apps'
			"
			multiple
			options-dense
			@update:model-value="update('appName', $event)"
		/>
		<div class="text-weight-medium">Stage</div>
		<SSelect
			:model-value="filters.facets.stageName ?? []"
			:options="stageOptions"
			aria-label="Stage"
			:display-value="
				(filters.facets.stageName ?? []).length
					? undefined
					: 'All stages'
			"
			multiple
			options-dense
			@update:model-value="update('stageName', $event)"
		/>
		<q-btn
			class="issue-filters__reset"
			:class="{ 'q-mt-sm': displayMode === 'mobile' }"
			outline
			no-caps
			icon="sym_r_restart_alt"
			label="Reset filters"
			@click="reset"
		/>
	</div>
</template>

<script setup lang="ts">
import { SSelect } from "@/components/ui/Select";
import type { Filters } from "@/components/ui/Table";
import type { Issue, IssueStatus } from "@sst-console/sdk";
import { computed } from "vue";
import { filterIssues } from "./issue-filters";

const props = defineProps<{
	filters: Filters;
	issues: Issue[];
	displayMode: "desktop" | "mobile";
}>();
const emit = defineEmits<{
	change: [filters: Filters];
}>();
const appOptions = computed(() =>
	[...new Set(props.issues.map(issue => issue.appName))].sort()
);
const stageOptions = computed(() =>
	[...new Set(props.issues.map(issue => issue.stageName))].sort()
);
const statusOptions = [
	{ label: "All", value: "" },
	{ label: "Open", value: "open" },
	{ label: "Resolved", value: "resolved" },
	{ label: "Suppressed", value: "suppressed" }
];
const queueOptions: { label: string; value: IssueStatus | ""; icon: string }[] =
	[
		{ label: "All issues", value: "", icon: "sym_r_grid_view" },
		{ label: "Open", value: "open", icon: "sym_r_error" },
		{ label: "Resolved", value: "resolved", icon: "sym_r_check" },
		{
			label: "Suppressed",
			value: "suppressed",
			icon: "sym_r_notifications_off"
		}
	];
const scopedIssues = computed(() =>
	filterIssues(props.issues, {
		...props.filters,
		facets: { ...props.filters.facets, status: [] }
	})
);
const counts = computed(() => ({
	open: scopedIssues.value.filter(issue => issue.status === "open").length,
	resolved: scopedIssues.value.filter(issue => issue.status === "resolved")
		.length,
	suppressed: scopedIssues.value.filter(
		issue => issue.status === "suppressed"
	).length
}));
const isActive = (status: string) => {
	const selected = props.filters.facets.status ?? [];
	return status
		? selected.length === 1 && selected[0] === status
		: selected.length === 0;
};
const update = (
	field: "appName" | "stageName" | "status",
	values: string[]
) => {
	emit("change", {
		...props.filters,
		facets: { ...props.filters.facets, [field]: values }
	});
};
const reset = () => {
	emit("change", { ...props.filters, facets: {} });
};
</script>

<style scoped>
.issue-filters {
	gap: 1rem;
	min-width: 0;
}
.issue-filters--desktop {
	min-height: 100%;
}
.issue-filters--desktop .issue-filters__reset {
	margin-top: auto;
}
.issue-filters > * {
	min-width: 0;
	max-width: 100%;
}
.issue-filters :deep(.q-list) {
	min-width: 0;
	max-width: 100%;
}
.issue-filters :deep(.q-item__section--avatar) {
	min-width: 38px;
	padding-right: 12px;
}
.issue-filters__active {
	background: var(--q-primary-2);
	color: var(--q-primary);
}
</style>
