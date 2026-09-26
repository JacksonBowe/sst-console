<template>
	<q-dialog
		ref="dialogRef"
		@hide="onDialogHide"
		persistent
		role="alertdialog"
		:aria-labelledby="ids.title"
		:aria-describedby="ids.desc"
	>
		<q-card class="q-dialog-plugin">
			<q-card-section class="column flex-center q-gutter-y-sm">
				<q-avatar
					:icon="icon"
					font-size="32px"
					:class="[
						'dialog-avatar',
						`bg-${variant}-2`,
						`text-${variant}`
					]"
				/>
				<div class="text-h6" :id="ids.title">{{ title }}</div>
				<div
					v-if="subtitle"
					class="text-subtitle2 text-center text-muted"
				>
					{{ subtitle }}
				</div>
			</q-card-section>

			<q-card-section
				class="column flex-center text-center text-muted"
				:id="ids.desc"
			>
				<!-- Custom message overrides default text -->
				<template v-if="message">
					<p class="q-mb-none">{{ message }}</p>
				</template>
				<template v-else>
					<p v-if="target" class="q-mb-none">
						Are you sure you want to {{ action }}
						<span class="text-bold">"{{ target }}"</span>?
					</p>
					<p v-if="destructive" class="q-mb-none"
						>This action cannot be undone.</p
					>
				</template>
			</q-card-section>

			<q-form @submit.prevent="submit" class="q-mt-none">
				<q-card-section v-if="validationString">
					<div class="text-center text-muted">
						Type the following to confirm:
						<br />
						<span
							:class="[
								'text-italic',
								'text-bold',
								`text-${variant}`
							]"
						>
							{{ validationString }}
							<span
								v-if="caseInsensitive"
								class="text-muted text-weight-regular"
							>
								(case-insensitive)
							</span>
						</span>
					</div>

					<q-input
						v-model.trim="model"
						outlined
						dense
						class="q-mt-sm"
						:autofocus="true"
						:disable="loading"
						lazy-rules="ondemand"
						:rules="[() => canSubmit || 'Value does not match']"
						@keyup.enter="canSubmit && !loading && submit()"
					/>
				</q-card-section>

				<q-card-section v-if="error" class="q-pt-none">
					<q-banner dense class="bg-negative-2 text-negative">
						{{ error }}
					</q-banner>
				</q-card-section>

				<q-card-actions class="flex-center q-px-md q-pb-md">
					<q-btn
						outline
						:label="cancelLabel"
						no-caps
						class="col-5 cancel-btn text-muted"
						:disable="loading"
						@click="onDialogCancel"
					/>
					<q-btn
						no-caps
						:label="confirmLabel"
						type="submit"
						class="col-5"
						:color="variant"
						:text-color="$q.dark.isActive ? 'black' : 'white'"
						:loading="loading"
						:disable="!canSubmit || loading"
					/>
				</q-card-actions>
			</q-form>
		</q-card>
	</q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from "quasar";
import { computed, reactive, ref } from "vue";

type DialogVariant = "primary" | "positive" | "warning" | "negative" | "info";

const props = withDefaults(
	defineProps<{
		title?: string;
		subtitle?: string;
		/** The name/identifier of the item being acted upon */
		target?: string;
		/** Custom message - if provided, replaces the auto-generated confirmation text */
		message?: string;
		/** The action verb (e.g., "delete", "deactivate", "archive") */
		action?: string;
		/** Whether to show "This action cannot be undone" warning */
		destructive?: boolean;
		/** String the user must type to confirm (for dangerous actions) */
		validationString?: string;
		caseInsensitive?: boolean;

		// Visual customization
		icon?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		/** Color variant - maps to Quasar semantic colors */
		variant?: DialogVariant;

		/**
		 * Optional async action to perform before closing.
		 * If provided and it throws, the dialog stays open and shows the error.
		 */
		perform?: () => Promise<unknown>;
	}>(),
	{
		title: "Confirm",
		action: "delete",
		destructive: true,
		icon: "sym_r_help_outline",
		confirmLabel: "Confirm",
		cancelLabel: "Cancel",
		variant: "primary",
		caseInsensitive: false
	}
);

defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
	useDialogPluginComponent();

const model = ref("");
const loading = ref(false);
const error = ref<string | null>(null);

// a11y ids
const ids = reactive({
	title: `dlg-title-${Math.random().toString(36).slice(2)}`,
	desc: `dlg-desc-${Math.random().toString(36).slice(2)}`
});

const canSubmit = computed(() => {
	if (!props.validationString) return true;
	if (props.caseInsensitive) {
		return (
			model.value.toLowerCase() === props.validationString.toLowerCase()
		);
	}
	return model.value === props.validationString;
});

async function submit() {
	error.value = null;

	// If a perform() is supplied, do it here and keep the dialog open + show spinner
	if (props.perform) {
		if (!canSubmit.value || loading.value) return;
		loading.value = true;
		try {
			await props.perform();
			onDialogOK({ value: model.value });
		} catch (e) {
			// Show a friendly error and keep dialog open
			if (e instanceof Error) {
				error.value = e?.message ?? "Action failed. Please try again.";
			}
		} finally {
			loading.value = false;
		}
	} else {
		// No perform() means the caller will handle the async work in .onOk(...)
		// We still pass payload for convenience
		onDialogOK({ value: model.value });
	}
}
</script>

<style scoped>
.dialog-avatar {
	width: 48px;
	height: 48px;
}

.cancel-btn:hover {
	opacity: 1;
}
</style>
