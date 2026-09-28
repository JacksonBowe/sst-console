<template>
	<q-card flat bordered>
		<q-card-section class="row items-center justify-between q-gutter-md">
			<div>
				<div class="text-subtitle1 text-weight-medium">Manage apps</div>
				<div class="text-body2 text-grey-7">
					Discovery lists state keys only. Ignored entries never
					download SST state.
				</div>
			</div>
			<q-toggle
				:model-value="onlySelected"
				:label="
					onlySelected
						? `Only selected (${selectedStageCount})`
						: 'All discovered'
				"
				@update:model-value="setOnlySelected"
			/>
		</q-card-section>
		<q-separator />

		<q-card-section v-if="loading" class="q-pa-xl">
			<q-spinner color="primary" size="32px" />
		</q-card-section>
		<q-card-section v-else-if="error">
			<q-banner class="bg-negative text-white">
				Unable to load discovered SST apps.
			</q-banner>
		</q-card-section>
		<q-card-section v-else class="q-gutter-y-sm">
			<AccountAppsList
				:apps="apps"
				:stage-included="stageIncluded"
				:app-ignored="appIgnored"
				:app-allowance-caption="appAllowanceCaption"
				:app-allowance-variant="appAllowanceVariant"
				@toggle-app="toggleApp"
				@toggle-stage="toggleStage"
			/>
		</q-card-section>
	</q-card>
</template>

<script setup lang="ts">
import type { AccountSyncPolicy, DiscoveredStage } from "@sst-console/sdk";
import { useAccountAppPolicy } from "@/composables/account-app-policy";

import AccountAppsList from "./AccountAppsList.vue";

const props = defineProps<{
	stages: DiscoveredStage[];
	policy: AccountSyncPolicy | null;
	loading: boolean;
	error: boolean;
}>();

const emit = defineEmits<{
	"update:policy": [policy: AccountSyncPolicy];
}>();

const {
	apps,
	onlySelected,
	selectedStageCount,
	stageIncluded,
	appIgnored,
	appAllowanceCaption,
	appAllowanceVariant,
	setOnlySelected,
	toggleApp,
	toggleStage
} = useAccountAppPolicy(
	() => props.stages,
	() => props.policy,
	policy => emit("update:policy", policy)
);
</script>
