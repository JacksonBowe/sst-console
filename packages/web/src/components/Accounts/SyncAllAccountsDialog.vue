<template>
	<q-dialog ref="dialogRef" persistent @hide="onDialogHide">
		<q-card class="q-dialog-plugin">
			<template v-if="phase === 'confirm'">
				<q-card-section
					class="column flex-center q-gutter-y-sm text-center"
				>
					<q-avatar
						icon="sym_r_sync"
						font-size="32px"
						class="bg-primary-2 text-primary"
					/>
					<div class="text-h6">Sync all accounts</div>
				</q-card-section>

				<q-card-section class="text-center text-muted">
					<p>
						Sync {{ accountIds.length }} connected AWS
						{{ accountIds.length === 1 ? "account" : "accounts" }}
						one at a time.
					</p>
					<p class="q-mb-none">
						Sync updates discovered Apps and Stages. It can remove
						entities no longer present in an account. With many
						accounts, this can take some time.
					</p>
				</q-card-section>

				<q-card-actions class="flex-center q-px-md q-pb-md">
					<q-btn
						outline
						no-caps
						label="Cancel"
						class="col-5 text-muted"
						@click="onDialogCancel"
					/>
					<q-btn
						no-caps
						color="primary"
						label="Sync all"
						class="col-5"
						@click="startSync"
					/>
				</q-card-actions>
			</template>

			<template v-else>
				<q-card-section class="q-pb-sm">
					<div class="text-h6">
						{{
							phase === "running"
								? "Syncing accounts"
								: "Sync complete"
						}}
					</div>
					<div
						v-if="phase === 'running'"
						class="text-body2 text-muted q-mt-xs"
					>
						Syncing {{ completedCount + 1 }} of
						{{ accountIds.length }}:
						<span class="text-mono">{{ currentAccountId }}</span>
					</div>
					<div v-else class="text-body2 text-muted q-mt-xs">
						{{ succeededCount }} succeeded,
						{{ failedCount }} failed.
					</div>
				</q-card-section>

				<q-card-section>
					<q-linear-progress
						class="q-mb-md"
						:value="completedCount / accountIds.length"
						color="primary"
						track-color="primary-2"
					/>
					<q-list class="q-gutter-y-sm">
						<q-item
							v-for="result in results"
							:key="result.accountId"
							class="rounded-borders bg-secondary-2"
						>
							<q-item-section avatar>
								<q-icon
									:name="
										result.status === 'succeeded'
											? 'sym_r_check_circle'
											: result.status === 'failed'
												? 'sym_r_error'
												: result.status === 'syncing'
													? 'sym_r_sync'
													: 'sym_r_schedule'
									"
									:color="
										result.status === 'succeeded'
											? 'positive'
											: result.status === 'failed'
												? 'negative'
												: 'secondary'
									"
								/>
							</q-item-section>
							<q-item-section>
								<q-item-label class="text-mono">
									{{ result.accountId }}
								</q-item-label>
								<q-item-label
									v-if="result.error"
									caption
									class="text-negative"
								>
									{{ result.error }}
								</q-item-label>
								<q-item-label
									v-else-if="result.status === 'syncing'"
									caption
								>
									Syncing
								</q-item-label>
								<q-item-label
									v-else-if="result.status === 'pending'"
									caption
								>
									Waiting
								</q-item-label>
							</q-item-section>
						</q-item>
					</q-list>
				</q-card-section>

				<q-card-actions
					v-if="phase === 'complete'"
					align="right"
					class="q-pa-md"
				>
					<q-btn
						no-caps
						color="primary"
						label="Close"
						@click="onDialogOK"
					/>
				</q-card-actions>
			</template>
		</q-card>
	</q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from "quasar";
import { computed, ref } from "vue";

import { useSyncAccount } from "@/composables/accounts";

type SyncResult = {
	accountId: string;
	status: "pending" | "syncing" | "succeeded" | "failed";
	error?: string;
};

const props = defineProps<{ accountIds: string[] }>();

defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
	useDialogPluginComponent();
const syncAccount = useSyncAccount();
const phase = ref<"confirm" | "running" | "complete">("confirm");
const currentAccountId = ref<string>();
const results = ref<SyncResult[]>([]);

const completedCount = computed(
	() =>
		results.value.filter(
			result =>
				result.status === "succeeded" || result.status === "failed"
		).length
);
const succeededCount = computed(
	() => results.value.filter(result => result.status === "succeeded").length
);
const failedCount = computed(() => completedCount.value - succeededCount.value);

async function startSync(): Promise<void> {
	phase.value = "running";
	results.value = props.accountIds.map(accountId => ({
		accountId,
		status: "pending"
	}));
	for (const [index, accountId] of props.accountIds.entries()) {
		const result = results.value[index];
		if (!result) continue;
		currentAccountId.value = accountId;
		result.status = "syncing";
		try {
			await syncAccount.mutateAsync(accountId);
			result.status = "succeeded";
		} catch (error) {
			result.status = "failed";
			result.error =
				error instanceof Error
					? error.message
					: "Unable to sync account";
		}
	}
	currentAccountId.value = undefined;
	phase.value = "complete";
}
</script>
