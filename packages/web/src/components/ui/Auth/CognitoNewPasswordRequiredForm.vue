<template>
	<div class="column q-gutter-y-md">
		<CognitoStatusBanner :status="status" />

		<q-form class="column q-gutter-y-md" @submit.prevent="onSubmit">
			<SInput
				v-model="email"
				type="email"
				autocomplete="email"
				hide-bottom-space
				readonly
				:label="texts.emailLabel"
			/>
			<SPasswordInput
				v-model="newPassword"
				:label="texts.newPasswordLabel"
				autocomplete="new-password"
				:rules="passwordRuleSet"
				:disable="loading"
			/>
			<SPasswordInput
				v-model="confirmPassword"
				:label="texts.confirmPasswordLabel"
				autocomplete="new-password"
				:rules="confirmPasswordRules"
				:disable="loading"
			/>

			<q-btn
				type="submit"
				color="primary"
				unelevated
				no-caps
				class="full-width text-weight-bold"
				:label="texts.setPasswordButton"
				:loading="loading"
			/>
		</q-form>

		<div class="text-center text-body2 text-grey-7">
			<a
				href=""
				class="text-primary text-weight-medium"
				:class="{ 'text-grey-6': loading }"
				:aria-disabled="loading"
				@click.prevent="!loading && emit('requestStep', 'sign-in')"
			>
				{{ texts.backToSignInLink }}
			</a>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { rules } from "../form";
import { SInput, SPasswordInput } from "../Input";
import CognitoStatusBanner from "./CognitoStatusBanner.vue";
import type {
	CognitoAuthStatus,
	CognitoAuthStep,
	CognitoAuthTexts
} from "./types";

const props = defineProps<{
	loading: boolean;
	status: CognitoAuthStatus | null;
	texts: CognitoAuthTexts;
	initialEmail?: string;
	session?: string;
}>();

const emit = defineEmits<{
	submit: [payload: { email: string; session: string; newPassword: string }];
	requestStep: [step: CognitoAuthStep];
}>();

const email = ref(props.initialEmail ?? "");
const newPassword = ref("");
const confirmPassword = ref("");
const passwordRuleSet = [
	...rules.required(props.texts.requiredMessage),
	...rules.minLength(8, props.texts.minPasswordMessage)
];
const confirmPasswordRules = computed(() => [
	...rules.required(props.texts.requiredMessage),
	...rules.isEqualTo(newPassword.value, props.texts.passwordMismatchMessage)
]);

watch(
	() => props.initialEmail,
	value => {
		if (value !== undefined) {
			email.value = value;
		}
	}
);

function onSubmit() {
	emit("submit", {
		email: email.value,
		session: props.session ?? "",
		newPassword: newPassword.value
	});
}
</script>
