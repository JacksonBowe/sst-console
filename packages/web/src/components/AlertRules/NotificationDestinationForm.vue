<template>
	<q-card class="full-width">
		<q-form @submit.prevent="save">
			<q-card-section>
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
			</q-card-section>
			<q-separator />
			<div class="row q-col-gutter-md q-pa-md">
				<div class="col-12 col-md-3">
					<q-list bordered class="rounded-borders">
						<q-item active active-class="bg-primary-2 text-primary">
							<q-item-section side>
								<q-icon name="sym_r_forum" />
							</q-item-section>
							<q-item-section>Discord</q-item-section>
						</q-item>
						<q-item disable>
							<q-item-section side>
								<q-icon name="sym_r_chat" />
							</q-item-section>
							<q-item-section>Slack</q-item-section>
						</q-item>
						<q-item disable>
							<q-item-section side>
								<q-icon name="sym_r_email" />
							</q-item-section>
							<q-item-section>SES</q-item-section>
						</q-item>
					</q-list>
				</div>
				<div class="col-12 col-md-9 q-gutter-y-md">
					<div>
						<div class="text-h6">Connect Discord</div>
						<div class="text-body2 text-muted q-mt-xs">
							Send alerts to a Discord channel with an incoming
							webhook.
						</div>
					</div>
					<q-expansion-item
						icon="sym_r_info"
						label="Discord webhook setup guide"
						class="bg-secondary-2 rounded-borders"
					>
						<div class="q-px-md q-pb-md">
							<ol class="q-my-none q-pl-md">
								<li>Open your Discord server settings.</li>
								<li>Choose Integrations, then Webhooks.</li>
								<li
									>Create a webhook and choose its
									channel.</li
								>
								<li>Copy webhook URL and paste it here.</li>
							</ol>
							<div class="q-mt-md">
								<div class="text-weight-medium"
									>Set webhook avatar</div
								>
								<div class="text-body2 text-muted q-mt-xs">
									In Discord webhook settings, select Avatar
									and upload Console icon.
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
								? 'Leave blank to keep the existing or enter a new URL to replace it.'
								: undefined
						"
						:rules="
							target
								? []
								: rules.required(
										'Discord webhook URL is required'
									)
						"
					/>
				</div>
			</div>
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
