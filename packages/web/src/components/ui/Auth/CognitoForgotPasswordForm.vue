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

			<q-btn
				type="submit"
				color="primary"
				unelevated
				no-caps
				class="full-width text-weight-bold"
				:label="texts.sendResetCodeButton"
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
import { rules } from "../form";
import { SInput } from "../Input";
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
	submit: [payload: { email: string }];
	requestStep: [step: CognitoAuthStep];
}>();

const email = useInitialEmail(() => props.initialEmail);
const emailRules = [
	...rules.required(props.texts.requiredMessage),
	...rules.isEmail(props.texts.invalidEmailMessage)
];

function onSubmit() {
	emit("submit", { email: email.value });
}
</script>
