<template>
	<div class="col">
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
		<div v-else-if="history.isError.value" class="q-pa-md">
			Unable to load history.
			<q-btn flat no-caps label="Retry" @click="history.refetch()" />
		</div>
		<div v-else-if="!updates.length" class="q-pa-lg text-center text-muted">
			No Updates stored. Discover history to find older artifacts.
		</div>
		<q-list v-else bordered separator>
			<q-item
				v-for="update in updates"
				:key="update.updateId"
				clickable
				@click="selectedId = update.updateId"
			>
				<q-item-section>
					<q-item-label
						>{{ update.command || "Command unavailable" }} ·
						{{ status(update) }}</q-item-label
					>
					<q-item-label caption
						>{{ update.updateId }} ·
						{{ timestamp(update.timeStarted) }} ·
						{{
							duration(update.timeStarted, update.timeCompleted)
						}}</q-item-label
					>
					<q-item-label caption>{{ counts(update) }}</q-item-label>
				</q-item-section>
				<q-item-section side
					><q-icon name="sym_r_chevron_right"
				/></q-item-section>
			</q-item>
		</q-list>

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
				<q-card-section class="col scroll">
					<div class="text-subtitle1"
						>{{ selected.command || "Command unavailable" }} ·
						{{ status(selected) }}</div
					>
					<div>Started: {{ timestamp(selected.timeStarted) }}</div>
					<div
						>Duration:
						{{
							duration(
								selected.timeStarted,
								selected.timeCompleted
							)
						}}</div
					>
					<div class="q-mt-sm">{{ counts(selected) }}</div>
					<div
						v-if="selected.comparisonStatus === 'unavailable'"
						class="text-warning"
						>Snapshot comparison unavailable.</div
					>
					<div class="text-subtitle1 q-mt-lg">Artifacts</div>
					<div>Update: {{ artifactStatus(selected) }}</div>
					<template v-if="detail.data.value">
						<div
							>Snapshot:
							{{
								artifactStatus(detail.data.value.snapshot)
							}}</div
						>
						<div
							>Event Log:
							{{
								artifactStatus(detail.data.value.eventLog)
							}}</div
						>
					</template>
					<div
						v-if="
							selected.errors?.length || selected.errorsTruncated
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
					<div class="text-subtitle1 q-mt-lg">Resource events</div>
					<div v-if="detail.isPending.value"
						>Loading Update details…</div
					>
					<div v-else-if="detail.isError.value"
						>Unable to load Update details.
						<q-btn
							flat
							no-caps
							label="Retry"
							@click="detail.refetch()"
					/></div>
					<template v-else>
						<div
							v-if="!detail.data.value?.events.length"
							class="text-muted"
							>No resource events available.</div
						>
						<div v-for="action in actions" :key="action">
							<template v-if="eventsFor(action).length">
								<div
									class="text-subtitle2 q-mt-md text-capitalize"
									>{{ action }} ({{
										eventsFor(action).length
									}})</div
								>
								<div
									v-for="event in eventsFor(action)"
									:key="event.resourceId"
									class="q-py-sm"
								>
									<div class="text-break">{{
										event.urn
									}}</div>
									<div class="text-caption text-muted"
										>{{ event.resourceType }} ·
										{{
											event.snapshot
												? "Snapshot change observed"
												: "No snapshot change observed"
										}}
										· Operation:
										{{
											event.operation?.outcome ??
											"unavailable"
										}}
										·
										{{
											duration(
												event.operation?.startedAt,
												event.operation?.completedAt
											)
										}}</div
									>
								</div>
							</template>
						</div>
					</template>
				</q-card-section>
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
import type {
	HistoryDiscoveryResult,
	HistoryKey,
	StateArtifact,
	StateResourceEvent,
	StateUpdate
} from "@sst-console/sdk";
import { Notify } from "quasar";
import { computed, ref, watch } from "vue";
import { handleApiError } from "@/boot/api-client";
import { formatDateTime } from "@/components/ui/format";
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
const updates = computed(() => history.data.value ?? []);
const selected = computed(
	() =>
		detail.data.value?.update ??
		updates.value.find(update => update.updateId === selectedId.value)
);
const discoveryResult = ref<HistoryDiscoveryResult>();
const showDiscovery = ref(false);
const actions = ["created", "updated", "deleted"] as const;

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

function eventsFor(action: StateResourceEvent["action"]) {
	return (detail.data.value?.events ?? []).filter(
		event => event.action === action
	);
}
function artifactStatus(artifact?: StateArtifact | null) {
	return !artifact
		? "Not discovered"
		: artifact.processedAt
			? "Processed"
			: "Unprocessed";
}
function status(update: StateUpdate) {
	if (!update.processedAt) return "Unprocessed";
	if (!update.timeCompleted) return "In progress";
	if (!update.errors) return "Unknown";
	return update.errors.length || update.errorsTruncated
		? "Failed"
		: "Succeeded";
}
function timestamp(value?: string) {
	return value && !Number.isNaN(Date.parse(value))
		? formatDateTime(value)
		: "Unavailable";
}
function duration(start?: string, end?: string) {
	if (!start || !end) return "Duration unavailable";
	const seconds = (Date.parse(end) - Date.parse(start)) / 1000;
	return Number.isFinite(seconds) && seconds >= 0
		? `${seconds.toFixed(1)}s`
		: "Duration unavailable";
}
function counts(update: StateUpdate) {
	const counts = update.resourceCounts;
	return counts
		? `Created ${counts.created} · Updated ${counts.updated} · Deleted ${counts.deleted} · Unchanged ${counts.unchanged}`
		: "Change counts unavailable";
}
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
.update-sheet {
	width: min(100vw, 42rem);
	max-width: 100vw;
	height: 100vh;
}
.text-break {
	overflow-wrap: anywhere;
}
</style>
