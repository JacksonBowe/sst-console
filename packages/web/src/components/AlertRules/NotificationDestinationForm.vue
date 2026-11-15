<template>
	<q-card style="width: 720px; max-width: 95vw">
		<q-form @submit.prevent="save">
			<q-card-section class="row no-wrap items-start">
				<div class="col">
					<div class="text-h6">
						{{
							target
								? "Edit notification destination"
								: "Add notification destination"
						}}
					</div>
					<div class="text-body2 text-muted q-mt-xs">
						Choose where Console should deliver issue notifications.
					</div>
				</div>
				<q-btn
					flat
					round
					dense
					icon="sym_r_close"
					aria-label="Close"
					:disable="saving"
					v-close-popup
				/>
			</q-card-section>
			<q-separator />
			<q-card-section class="q-gutter-y-md">
				<div>
					<div class="text-weight-medium q-mb-sm">Provider</div>
					<div class="row q-col-gutter-sm">
						<div class="col-12 col-sm-4">
							<q-item
								class="provider-card provider-card--selected rounded-borders"
								aria-label="Discord, selected provider"
							>
								<q-item-section avatar>
									<q-icon :name="`img:${discordIcon}`" size="sm" />
								</q-item-section>
								<q-item-section
									><q-item-label>Discord</q-item-label
									><q-item-label caption
										>Webhook to a channel</q-item-label
									></q-item-section
								>
							</q-item>
						</div>
						<div class="col-12 col-sm-4">
							<q-item
								class="provider-card rounded-borders"
								disable
							>
								<q-item-section avatar>
									<q-icon :name="`img:${slackIcon}`" size="sm" />
								</q-item-section>
								<q-item-section
									><q-item-label>Slack</q-item-label
									><q-item-label caption
										>Coming soon</q-item-label
									></q-item-section
								>
							</q-item>
						</div>
						<div class="col-12 col-sm-4">
							<q-item
								class="provider-card rounded-borders"
								disable
							>
								<q-item-section avatar
									><q-icon name="sym_r_email" size="sm"
								/></q-item-section>
								<q-item-section
									><q-item-label>SES</q-item-label
									><q-item-label caption
										>Coming soon</q-item-label
									></q-item-section
								>
							</q-item>
						</div>
					</div>
				</div>
				<SInput
					v-model.trim="form.name"
					label="Destination name"
					hint="Use a name that identifies this Discord destination."
					:rules="rules.required('Destination name is required')"
					placeholder="My Server #general"
				/>
				<SInput
					v-model.trim="form.webhookUrl"
					type="password"
					label="Discord webhook URL"
					:placeholder="
						target
							? 'Leave blank to keep the existing webhook'
							: undefined
					"
					:hint="
						target
							? 'Leave blank to keep the existing webhook. Enter a new URL to replace it.'
							: 'The incoming webhook URL for this Discord channel.'
					"
					:rules="
						target
							? []
							: rules.required('Discord webhook URL is required')
					"
				/>
				<q-expansion-item
					icon="sym_r_info"
					label="How to get a webhook URL"
					class="bg-secondary-2 rounded-borders overflow-hidden"
				>
					<div class="q-px-md q-pb-md">
						<ol class="q-my-none q-pl-md">
							<li>Open your Discord server settings.</li>
							<li>Choose Integrations, then Webhooks.</li>
							<li>Create a webhook and choose its channel.</li>
							<li>Copy webhook URL and paste it here.</li>
						</ol>
						<div class="q-mt-md">
							<div class="text-weight-medium"
								>Set webhook avatar</div
							>
							<div class="text-body2 text-muted q-mt-xs">
								In Discord webhook settings, select Avatar and
								upload Console icon.
							</div>
							<q-btn
								flat
								no-caps
								color="primary"
								class="q-mt-sm q-px-none"
								icon="sym_r_download"
								label="Download Console icon"
								href="/icons/favicon-128x128.png"
								download="sst-console-icon.png"
							/>
						</div>
						<q-btn
							flat
							no-caps
							color="primary"
							class="q-mt-sm q-px-none"
							label="Discord webhook guide"
							href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks"
							target="_blank"
							rel="noopener noreferrer"
						/>
					</div>
				</q-expansion-item>
			</q-card-section>
			<q-separator />
			<q-card-actions align="right">
				<q-btn
					flat
					no-caps
					label="Cancel"
					:disable="saving"
					v-close-popup
				/>
				<q-btn
					unelevated
					no-caps
					color="primary"
					label="Save destination"
					type="submit"
					:loading="saving"
					:disable="!dirty || saving"
				/>
			</q-card-actions>
		</q-form>
	</q-card>
</template>

<script setup lang="ts">
import type {
	NotificationDestination,
	NotificationDestinationInput
} from "@sst-console/sdk";
import { ref } from "vue";

import discordIcon from "@/assets/discord-icon.svg";
import slackIcon from "@/assets/slack-icon.svg";
import {
	useCreateNotificationDestination,
	useUpdateNotificationDestination
} from "@/composables/notification-destinations";
import { rules, useForm } from "@/components/ui/form";
import { SInput } from "@/components/ui/Input";

const props = defineProps<{ target?: NotificationDestination }>();
const emit = defineEmits<{ success: [] }>();
const createNotificationDestinationMutation =
	useCreateNotificationDestination();
const updateNotificationDestinationMutation =
	useUpdateNotificationDestination();
const saving = ref(false);
const { form, dirty } = useForm({
	name: props.target?.name ?? "",
	webhookUrl: ""
});

function save() {
	saving.value = true;
	const callbacks = {
		onSuccess: () => emit("success"),
		onSettled: () => {
			saving.value = false;
		}
	};
	if (props.target) {
		updateNotificationDestinationMutation.mutate(
			{
				id: props.target.id,
				input: {
					name: form.name,
					...(form.webhookUrl && {
						channelConfig: { webhookUrl: form.webhookUrl }
					})
				}
			},
			callbacks
		);
	} else {
		const input: NotificationDestinationInput = {
			name: form.name,
			channel: "discord",
			channelConfig: { webhookUrl: form.webhookUrl }
		};
		createNotificationDestinationMutation.mutate(input, callbacks);
	}
}
</script>

<style scoped>
.provider-card {
	border: 1px solid var(--q-secondary-2);
	min-height: 80px;
}

.provider-card--selected {
	border-color: var(--q-primary);
	background: var(--q-primary-2);
}
</style>
