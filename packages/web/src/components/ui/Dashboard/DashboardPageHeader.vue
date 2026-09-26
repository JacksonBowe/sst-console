<template>
	<div
		class="row flex justify-between items-center"
		:class="$q.screen.lt.sm ? 'q-mb-sm' : 'q-mb-lg'"
	>
		<slot v-if="$slots.default" />

		<template v-else>
			<div>
				<q-btn
					v-if="backConfig"
					flat
					dense
					no-caps
					color="grey-7"
					icon="sym_r_arrow_back_2"
					:label="backConfig.label"
					:to="backConfig.to"
					class="q-mb-xs"
					@click="handleBackClick"
				/>
				<DashboardPageHeaderTitle :title="title" />
				<div v-if="subtitle" class="text-body2 text-grey-7 q-mt-xs">
					{{ subtitle }}
				</div>
			</div>

			<DashboardPageHeaderActions v-if="$slots.actions">
				<slot name="actions" />
			</DashboardPageHeaderActions>
		</template>
	</div>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar";
import { computed } from "vue";
import { useRouter } from "vue-router";

import DashboardPageHeaderActions from "./DashboardPageHeaderActions.vue";
import DashboardPageHeaderTitle from "./DashboardPageHeaderTitle.vue";

type DashboardPageHeaderBack =
	| string
	| {
			label: string;
			to?: string | Record<string, unknown> | undefined;
	  };

type NormalizedBack = {
	label: string;
	to?: string | Record<string, unknown> | undefined;
};

const props = defineProps<{
	title?: string | undefined;
	subtitle?: string | undefined;
	back?: DashboardPageHeaderBack | undefined;
}>();

const $q = useQuasar();
const router = useRouter();

const backConfig = computed<NormalizedBack | null>(() => {
	if (!props.back) return null;
	if (typeof props.back === "string") return { label: props.back };

	return props.back;
});

function handleBackClick() {
	if (!backConfig.value || backConfig.value.to) return;

	router.back();
}
</script>
