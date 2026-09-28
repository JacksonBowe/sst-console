<template>
	<SExpansionSection
		v-for="app in apps"
		:key="app.name"
		:label="app.name"
		:caption="appAllowanceCaption(app)"
		icon="sym_r_deployed_code"
		:variant="appAllowanceVariant(app)"
	>
		<template #header-side>
			<q-btn
				flat
				dense
				no-caps
				:color="appIgnored(app.name) ? 'primary' : 'negative'"
				:label="appIgnored(app.name) ? 'Include app' : 'Ignore app'"
				@click.stop="$emit('toggle-app', app.name)"
			/>
		</template>
		<q-list separator>
			<q-item v-for="stage in app.stages" :key="stageKey(stage)" rounded>
				<q-item-section avatar>
					<q-checkbox
						:model-value="stageIncluded(stage)"
						@update:model-value="
							$emit('toggle-stage', stage, $event)
						"
					/>
				</q-item-section>
				<q-item-section>
					<q-item-label>{{ stage.stage }}</q-item-label>
					<q-item-label caption>{{ stage.key }}</q-item-label>
				</q-item-section>
			</q-item>
		</q-list>
	</SExpansionSection>
	<div v-if="apps.length === 0" class="text-body2 text-grey-7 q-pa-md">
		No SST apps discovered. Refresh discovery first.
	</div>
</template>

<script setup lang="ts">
import type { DiscoveredStage } from "@sst-console/sdk";

import type { ManagedAccountApp } from "@/composables/account-app-policy";
import { SExpansionSection } from "@/components/ui/Expansion";

defineProps<{
	apps: ManagedAccountApp[];
	stageIncluded: (stage: DiscoveredStage) => boolean;
	appIgnored: (app: string) => boolean | undefined;
	appAllowanceCaption: (app: ManagedAccountApp) => string;
	appAllowanceVariant: (
		app: ManagedAccountApp
	) => "default" | "muted" | "warning";
}>();

defineEmits<{
	"toggle-app": [app: string];
	"toggle-stage": [stage: DiscoveredStage, included: boolean];
}>();

function stageKey(stage: DiscoveredStage) {
	return `${stage.app}\u0000${stage.stage}`;
}
</script>
