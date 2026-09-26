<template>
	<div class="column q-gutter-y-md">
		<CognitoStatusBanner :status="status" />

		<q-form class="column q-gutter-y-md" @submit.prevent="onSubmit">
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
				autocomplete="current-password"
				:allow-visibility-toggle="false"
				:rules="passwordRules"
				:disable="loading"
			>
				<template #labelActions>
					<a
						href=""
						class="text-caption text-primary text-weight-medium"
						:class="{ 'text-grey-6': loading }"
						:aria-disabled="loading"
						@click.prevent="
							!loading && emit('requestStep', 'forgot-password')
						"
					>
						{{ texts.forgotPasswordLink }}
					</a>
				</template>
			</SPasswordInput>

			<q-btn
				type="submit"
				color="primary"
				unelevated
				no-caps
				class="full-width text-weight-bold"
				:label="texts.signInButton"
				:loading="loading"
			/>
		</q-form>

		<div v-if="allowSignUp" class="text-center text-body2 text-grey-7">
			Need an account?
			<a
				href=""
				class="text-primary text-weight-medium q-ml-xs"
				:class="{ 'text-grey-6': loading }"
				:aria-disabled="loading"
				@click.prevent="!loading && emit('requestStep', 'sign-up')"
			>
				{{ texts.signUpLink }}
			</a>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from "vue";

import { rules } from "../form";
import { SInput, SPasswordInput } from "../Input";
import CognitoStatusBanner from "./CognitoStatusBanner.vue";
import type {
	CognitoAuthStatus,
	CognitoPasswordPolicy,
	CognitoAuthStep,
	CognitoAuthTexts
} from "./types";
import { useInitialEmail } from "./useInitialEmail";

const props = defineProps<{
	loading: boolean;
	status: CognitoAuthStatus | null;
	texts: CognitoAuthTexts;
	initialEmail?: string;
	allowSignUp: boolean;
	passwordPolicy: CognitoPasswordPolicy;
}>();

const emit = defineEmits<{
	submit: [payload: { email: string; password: string }];
	requestStep: [step: CognitoAuthStep];
}>();

const email = useInitialEmail(() => props.initialEmail);
const password = ref("");
const passwordRules = rules.passwordPolicy(props.passwordPolicy, {
	required: props.texts.requiredMessage,
	minimumLength: props.texts.minPasswordMessage,
	lowercase: props.texts.passwordLowercaseMessage,
	number: props.texts.passwordNumberMessage,
	symbol: props.texts.passwordSymbolMessage,
	uppercase: props.texts.passwordUppercaseMessage
});
const emailRules = [
	...rules.required(props.texts.requiredMessage),
	...rules.isEmail(props.texts.invalidEmailMessage)
];

function onSubmit() {
	emit("submit", { email: email.value, password: password.value });
}
</script>
