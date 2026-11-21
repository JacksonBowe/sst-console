<template>
	<q-card class="q-dialog-plugin">
		<q-form @submit.prevent="submit">
			<q-card-section>
				<div class="text-h6">Invite user</div>
				<div class="text-secondary">
					Send an invitation to join SST Console.
				</div>
			</q-card-section>
			<q-card-section>
				<SInput
					v-model.trim="form.email"
					label="Email"
					type="email"
					:rules="rules.required('Email is required')"
				/>
			</q-card-section>
			<q-card-actions align="right">
				<q-btn
					flat
					no-caps
					label="Cancel"
					:disable="invite.isPending.value"
					v-close-popup
				/>
				<q-btn
					unelevated
					no-caps
					color="primary"
					label="Send invitation"
					type="submit"
					:loading="invite.isPending.value"
					:disable="!dirty || invite.isPending.value"
				/>
			</q-card-actions>
		</q-form>
	</q-card>
</template>

<script setup lang="ts">
import { rules, useForm } from "@/components/ui/form";
import { SInput } from "@/components/ui/Input";
import { useInviteUser } from "@/composables/users";

const emit = defineEmits<{ success: [] }>();
const invite = useInviteUser();
const { form, dirty } = useForm({ email: "" });

function submit() {
	invite.mutate(
		{ email: form.email.trim() },
		{ onSuccess: () => emit("success") }
	);
}
</script>
