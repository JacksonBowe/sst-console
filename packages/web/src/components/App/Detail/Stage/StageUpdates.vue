<template>
	<div class="stage-updates col">
		<div class="row items-center justify-between q-mb-md">
			<div class="text-h6">Updates</div>
			<q-btn
				color="primary"
				outline
				no-caps
				label="Discover history"
				:loading="discovery.isPending.value"
				@click="discover"
			/>
		</div>
		<div v-if="history.isPending.value" class="q-pa-md"
			>Loading updates…</div
		>
		<div
			v-else-if="history.isError.value && !history.data.value"
			class="q-pa-md"
		>
			Unable to load history.
			<q-btn flat no-caps label="Retry" @click="history.refetch()" />
		</div>
		<div
			v-else-if="!updates.length && !history.hasNextPage.value"
			class="q-pa-lg text-center text-muted"
		>
			No Updates stored. Discover history to find older artifacts.
		</div>
		<q-scroll-area
			v-else-if="$q.screen.gt.sm"
			class="col stage-updates__scroll"
			visible
			:vertical-bar-style="{
				background: 'var(--q-border)',
				opacity: '1',
				width: '6px',
				borderRadius: '3px'
			}"
			:vertical-thumb-style="{
				background: 'var(--q-text-secondary)',
				opacity: '0.7',
				width: '6px',
				borderRadius: '3px'
			}"
			tabindex="0"
			role="region"
			aria-label="Update history"
		>
			<div class="q-pr-md">
				<q-infinite-scroll
					:disable="
						!history.hasNextPage.value ||
						history.isFetchNextPageError.value
					"
					@load="loadMore"
				>
					<UpdateTimeline
						:updates="updates"
						@select="selectedId = $event"
					/>
					<div
						v-if="history.hasNextPage.value"
						class="text-center q-pa-md"
					>
						<div v-if="history.isFetchNextPageError.value"
							>Unable to load more Updates.</div
						>
						<q-btn
							flat
							no-caps
							:label="
								history.isFetchNextPageError.value
									? 'Retry'
									: 'Load more'
							"
							:loading="history.isFetchingNextPage.value"
							@click="fetchMore"
						/>
					</div>
				</q-infinite-scroll>
			</div>
		</q-scroll-area>
		<q-infinite-scroll
			v-else
			:disable="
				!history.hasNextPage.value || history.isFetchNextPageError.value
			"
			@load="loadMore"
		>
			<UpdateTimeline :updates="updates" @select="selectedId = $event" />
			<div v-if="history.hasNextPage.value" class="text-center q-pa-md">
				<div v-if="history.isFetchNextPageError.value"
					>Unable to load more Updates.</div
				>
				<q-btn
					flat
					no-caps
					:label="
						history.isFetchNextPageError.value
							? 'Retry'
							: 'Load more'
					"
					:loading="history.isFetchingNextPage.value"
					@click="fetchMore"
				/>
			</div>
		</q-infinite-scroll>

		<q-dialog v-model="showDiscovery">
			<q-card style="min-width: min(90vw, 32rem)">
				<q-card-section
					><div class="text-h6"
						>History discovery</div
					></q-card-section
				>
				<q-card-section v-if="discoveryResult">
					{{ discoveryResult.processed }} discovered ·
					{{ discoveryResult.skipped }} skipped ·
					{{ discoveryResult.failed }} failed
					<q-expansion-item
						v-if="discoveryResult.failed"
						label="Failed artifacts"
						class="q-mt-md"
					>
						<div
							v-for="failure in discoveryResult.failures"
							:key="failure.key"
							class="q-pa-sm"
						>
							<div class="text-break">{{ failure.key }}</div
							><div class="text-muted">{{ failure.reason }}</div>
						</div>
						<div v-if="discoveryResult.failuresTruncated"
							>Additional failures omitted.</div
						>
					</q-expansion-item>
				</q-card-section>
				<q-card-actions align="right"
					><q-btn v-close-popup flat label="Close"
				/></q-card-actions>
			</q-card>
		</q-dialog>

		<q-dialog
			:model-value="Boolean(selected)"
			position="right"
			@update:model-value="
				value => {
					if (!value) selectedId = '';
				}
			"
		>
			<q-card v-if="selected" class="update-sheet column no-wrap">
				<q-card-section class="row items-center no-wrap">
					<div class="col"
						><div class="text-h6">Update</div
						><div class="text-caption text-break">{{
							selected.updateId
						}}</div></div
					>
					<q-btn
						flat
						round
						dense
						icon="sym_r_close"
						aria-label="Close"
						v-close-popup
					/>
				</q-card-section>
				<q-separator />
				<q-scroll-area
					class="col update-sheet__scroll"
					tabindex="0"
					role="region"
					aria-label="Update details"
				>
					<q-card-section>
						<UpdateSummary
							:update="selected"
							:is-newest="
								selected.updateId === updates[0]?.updateId
							"
							:detail="detail.data.value"
						/>
						<div
							v-if="
								selected.errors?.length ||
								selected.errorsTruncated
							"
							class="q-mt-lg"
						>
							<div class="text-subtitle1">Errors</div>
							<div
								v-for="(error, index) in selected.errors"
								:key="index"
								class="q-mb-sm text-break"
								><div>{{ error.urn }}</div
								><div>{{ error.message }}</div></div
							>
							<div v-if="selected.errorsTruncated"
								>Some errors were omitted.</div
							>
						</div>
						<div v-if="detail.isPending.value" class="q-mt-lg"
							>Loading Update details…</div
						>
						<div v-else-if="detail.isError.value" class="q-mt-lg"
							>Unable to load Update details.
							<q-btn
								flat
								no-caps
								label="Retry"
								@click="detail.refetch()"
						/></div>
						<div v-else class="q-mt-lg">
							<UpdateResourceEvents
								:events="detail.data.value?.events ?? []"
							/>
						</div>
					</q-card-section>
				</q-scroll-area>
				<q-separator />
				<q-card-actions align="right"
					><q-btn
						color="primary"
						no-caps
						:label="selected.processedAt ? 'Reprocess' : 'Process'"
						:loading="processing.isPending.value"
						@click="process"
				/></q-card-actions>
			</q-card>
		</q-dialog>
	</div>
</template>

<script setup lang="ts">
import type { HistoryDiscoveryResult, HistoryKey } from "@sst-console/sdk";
import { Notify } from "quasar";
import { computed, ref, watch } from "vue";
import { handleApiError } from "@/boot/api-client";
import UpdateTimeline from "./Updates/UpdateTimeline.vue";
import UpdateResourceEvents from "./Updates/UpdateResourceEvents.vue";
import UpdateSummary from "./Updates/UpdateSummary.vue";
import {
	useDiscoverStateHistory,
	useProcessStateHistory,
	useStateHistory,
	useStateUpdateDetail
} from "@/composables/state-history";

const props = defineProps<{ historyKey: HistoryKey }>();
const key = computed(() => props.historyKey);
const history = useStateHistory(key, true);
const discovery = useDiscoverStateHistory();
const processing = useProcessStateHistory();
const selectedId = ref("");
const detail = useStateUpdateDetail(key, selectedId);
const updates = computed(
	() => history.data.value?.pages.flatMap(page => page.items) ?? []
);
const selected = computed(
	() =>
		detail.data.value?.update ??
		updates.value.find(update => update.updateId === selectedId.value)
);
const discoveryResult = ref<HistoryDiscoveryResult>();
const showDiscovery = ref(false);

async function fetchMore() {
	if (!history.hasNextPage.value || history.isFetching.value) return;
	await history.fetchNextPage();
}

async function loadMore(_index: number, done: (stop?: boolean) => void) {
	try {
		await fetchMore();
	} finally {
		done();
	}
}

watch(updates, value => {
	if (
		selectedId.value &&
		!value.some(item => item.updateId === selectedId.value)
	)
		selectedId.value = "";
});
watch(
	() => [
		props.historyKey.accountId,
		props.historyKey.appName,
		props.historyKey.stageName
	],
	() => {
		selectedId.value = "";
	}
);

async function discover() {
	try {
		discoveryResult.value = await discovery.mutateAsync(key.value);
		showDiscovery.value = true;
	} catch (error) {
		handleApiError(error);
	}
}
async function process() {
	try {
		const result = await processing.mutateAsync({
			key: key.value,
			updateId: selectedId.value
		});
		Notify.create({
			message: `${result.published} artifacts queued for processing. Results may appear later.`,
			color: result.published ? "positive" : "warning"
		});
	} catch (error) {
		handleApiError(error);
	}
}
</script>

<style scoped>
@media (min-width: 1024px) {
	.stage-updates {
		display: flex;
		flex-direction: column;
		min-height: 0;
	}
	.stage-updates__scroll {
		min-height: 0;
	}
}
.update-sheet {
	width: min(100vw, 42rem);
	max-width: 100vw;
	height: 100vh;
}
.update-sheet__scroll {
	min-height: 0;
}
.text-break {
	overflow-wrap: anywhere;
}
</style>
