<template>
	<div class="column q-gutter-y-md">
		<CognitoStatusBanner :status="status" />

		<q-form class="column q-gutter-y-md" @submit.prevent="onSubmit">
			<SInput
				v-model="name"
				autocomplete="name"
				lazy-rules="ondemand"
				hide-bottom-space
				:label="texts.nameLabel"
				:rules="requiredRules"
				:disable="loading"
			/>
			<SInput
				v-model="email"
				type="email"
				autocomplete="email"
				lazy-rules="ondemand"
				hide-bottom-space
				:label="texts.emailLabel"
				:rules="emailRules"
				:disable="loading"
			/>

			<SPasswordInput
				v-model="password"
				:label="texts.passwordLabel"
				autocomplete="new-password"
				lazy-rules="ondemand"
				hide-bottom-space
				:rules="passwordRules"
				:disable="loading"
			/>
			<SPasswordInput
				v-model="confirmPassword"
				:label="texts.confirmPasswordLabel"
				autocomplete="new-password"
				lazy-rules="ondemand"
				hide-bottom-space
				:rules="confirmPasswordRules"
				:disable="loading"
			/>

			<q-btn
				type="submit"
				color="primary"
				unelevated
				no-caps
				class="full-width text-weight-bold"
				:label="texts.signUpButton"
				:loading="loading"
			/>
		</q-form>

		<div class="text-center text-body2 text-grey-7">
			Already have an account?
			<a
				href=""
				class="text-primary text-weight-medium q-ml-xs"
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
import { computed, ref } from "vue";

import { rules } from "../form";
import { SInput, SPasswordInput } from "../Input";
import CognitoStatusBanner from "./CognitoStatusBanner.vue";
import type {
	CognitoAuthStatus,
	CognitoAuthStep,
	CognitoAuthTexts
} from "./types";
import { useInitialEmail } from "./useInitialEmail";

const props = defineProps<{
	loading: boolean;
	status: CognitoAuthStatus | null;
	texts: CognitoAuthTexts;
	initialEmail?: string;
}>();

const emit = defineEmits<{
	submit: [payload: { name: string; email: string; password: string }];
	requestStep: [step: CognitoAuthStep];
}>();

const name = ref("");
const email = useInitialEmail(() => props.initialEmail);
const password = ref("");
const confirmPassword = ref("");
const requiredRules = rules.required(props.texts.requiredMessage);
const emailRules = [
	...rules.required(props.texts.requiredMessage),
	...rules.isEmail(props.texts.invalidEmailMessage)
];
const passwordRules = [
	...rules.required(props.texts.requiredMessage),
	...rules.minLength(8, props.texts.minPasswordMessage)
];
const confirmPasswordRules = computed(() => [
	...rules.required(props.texts.requiredMessage),
	...rules.isEqualTo(password.value, props.texts.passwordMismatchMessage)
]);

function onSubmit() {
	emit("submit", {
		name: name.value,
		email: email.value,
		password: password.value
	});
}
</script>
