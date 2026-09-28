<template>
	<q-card class="connect-account-dialog">
		<q-card-section>
			<div class="text-h6">Connect AWS account</div>
			<div class="text-body2 text-secondary q-mt-sm">
				Deploy a ConsoleConnection stack in your workload AWS account to
				grant Console access to sync data.
			</div>
		</q-card-section>

		<q-card-section class="q-pt-none">
			<ol
				class="connect-account-dialog__steps q-my-none q-pl-lg text-body2"
			>
				<li>Sign in to workload AWS account.</li>
				<li
					>Copy Quick Create URL below and paste it into browser
					address bar.</li
				>
				<li>Review CloudFormation stack, then select Create stack.</li>
			</ol>

			<q-input
				:model-value="quickCreateUrl"
				readonly
				outlined
				dense
				type="textarea"
				autogrow
				label="Quick Create URL"
				class="q-mt-md"
			>
				<template #append>
					<q-btn
						flat
						round
						dense
						icon="sym_r_content_copy"
						aria-label="Copy Quick Create URL"
						@click="copyUrl"
					/>
				</template>
			</q-input>
		</q-card-section>

		<q-card-section class="q-pt-none">
			<q-checkbox
				v-model="acknowledged"
				label="I’m signed in to workload AWS account."
			/>
		</q-card-section>

		<q-card-actions align="right" class="q-px-md q-pb-md">
			<q-btn flat no-caps label="Cancel" v-close-popup />
			<q-btn
				unelevated
				no-caps
				color="primary"
				label="Open Quick Create"
				:href="quickCreateUrl"
				target="_blank"
				rel="noopener noreferrer"
				:disable="!acknowledged"
				v-close-popup
			/>
		</q-card-actions>
	</q-card>
</template>

<script setup lang="ts">
import { Notify } from "quasar";
import { ref } from "vue";

const props = defineProps<{ quickCreateUrl: string }>();

const acknowledged = ref(false);

async function copyUrl(): Promise<void> {
	try {
		await navigator.clipboard.writeText(props.quickCreateUrl);
		Notify.create({
			message: "Quick Create URL copied",
			color: "positive",
			icon: "sym_r_check"
		});
	} catch {
		Notify.create({
			message: "Unable to copy URL. Select and copy it manually.",
			color: "negative",
			icon: "sym_r_error"
		});
	}
}
</script>

<style scoped lang="scss">
.connect-account-dialog {
	width: min(100vw - 32px, 640px);
}

.connect-account-dialog__steps {
	line-height: 1.6;
}
</style>
