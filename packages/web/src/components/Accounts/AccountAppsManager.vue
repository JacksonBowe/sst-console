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
			<q-btn
				flat
				dense
				no-caps
				icon="sym_r_data_object"
				label="Debug policy"
				:disable="!policy"
				@click="showPolicy = true"
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

		<q-dialog v-model="showPolicy">
			<q-card style="width: min(720px, 90vw)">
				<q-card-section
					class="row items-center justify-between q-pb-sm"
				>
					<div class="text-h6">Sync policy</div>
					<q-btn
						flat
						round
						dense
						icon="sym_r_close"
						aria-label="Close sync policy dialog"
						v-close-popup
					/>
				</q-card-section>
				<q-card-section class="q-pt-none">
					<JsonPreview :value="policy" />
				</q-card-section>
			</q-card>
		</q-dialog>
	</q-card>
</template>

<script setup lang="ts">
import type { AccountSyncPolicy, DiscoveredStage } from "@sst-console/sdk";
import { ref } from "vue";

import { useAccountAppPolicy } from "@/composables/account-app-policy";
import { JsonPreview } from "@/components/ui/Preview";

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

const showPolicy = ref(false);
const {
	apps,
	stageIncluded,
	appIgnored,
	appAllowanceCaption,
	appAllowanceVariant,
	toggleApp,
	toggleStage
} = useAccountAppPolicy(
	() => props.stages,
	() => props.policy,
	policy => emit("update:policy", policy)
);
</script>
