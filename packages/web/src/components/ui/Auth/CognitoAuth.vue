<template>
	<q-card v-bind="$attrs" class="cognito-auth" flat>
		<q-card-section
			class="text-center q-gutter-y-sm q-px-lg q-pt-xl q-pb-md"
		>
			<slot
				name="header"
				:step="step"
				:title="title"
				:subtitle="subtitle"
			>
				<img
					v-if="assets?.logoSrc"
					:src="assets.logoSrc"
					:alt="assets.logoAlt ?? ''"
					class="cognito-auth__logo q-mb-sm"
				/>
				<div class="text-h5 text-weight-bold">{{ title }}</div>
				<div class="text-body2 text-grey-7">{{ subtitle }}</div>
			</slot>
		</q-card-section>

		<q-card-section class="q-px-lg q-pb-xl">
			<CognitoSignInForm
				v-if="step === 'sign-in'"
				:loading="isLoading"
				:status="currentStatus"
				:texts="resolvedTexts"
				:initial-email="lastEmail"
				:allow-sign-up="allowSignUp"
				:password-policy="passwordPolicy"
				@submit="handleSignIn"
				@request-step="setStep"
			/>
			<CognitoSignUpForm
				v-else-if="step === 'sign-up'"
				:loading="isLoading"
				:status="currentStatus"
				:texts="resolvedTexts"
				:initial-email="lastEmail"
				:password-policy="passwordPolicy"
				@submit="handleSignUp"
				@request-step="setStep"
			/>
			<CognitoConfirmSignUpForm
				v-else-if="step === 'confirm-sign-up'"
				:loading="isLoading"
				:status="currentStatus"
				:texts="resolvedTexts"
				:initial-email="lastEmail"
				@submit="handleConfirmSignUp"
				@resend="handleResendSignUpCode"
				@request-step="setStep"
			/>
			<CognitoForgotPasswordForm
				v-else-if="step === 'forgot-password'"
				:loading="isLoading"
				:status="currentStatus"
				:texts="resolvedTexts"
				:initial-email="lastEmail"
				@submit="handleForgotPassword"
				@request-step="setStep"
			/>
			<CognitoConfirmForgotPasswordForm
				v-else-if="step === 'confirm-forgot-password'"
				:loading="isLoading"
				:status="currentStatus"
				:texts="resolvedTexts"
				:initial-email="lastEmail"
				:password-policy="passwordPolicy"
				@submit="handleConfirmForgotPassword"
				@resend="handleResendForgotPasswordCode"
				@request-step="setStep"
			/>
			<CognitoNewPasswordRequiredForm
				v-else
				:loading="isLoading"
				:status="currentStatus"
				:texts="resolvedTexts"
				:initial-email="lastEmail"
				:session="challengeSession"
				:password-policy="passwordPolicy"
				@submit="handleNewPasswordRequired"
				@request-step="setStep"
			/>
		</q-card-section>

		<template v-if="$slots.footer">
			<q-separator inset />
			<q-card-section class="q-px-lg q-pb-lg">
				<slot name="footer" :step="step" />
			</q-card-section>
		</template>
	</q-card>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

import CognitoConfirmForgotPasswordForm from "./CognitoConfirmForgotPasswordForm.vue";
import CognitoConfirmSignUpForm from "./CognitoConfirmSignUpForm.vue";
import CognitoForgotPasswordForm from "./CognitoForgotPasswordForm.vue";
import CognitoNewPasswordRequiredForm from "./CognitoNewPasswordRequiredForm.vue";
import CognitoSignInForm from "./CognitoSignInForm.vue";
import CognitoSignUpForm from "./CognitoSignUpForm.vue";
import { defaultCognitoAuthTexts } from "./defaults";
import type {
	CognitoAuthActionResult,
	CognitoAuthAssets,
	CognitoAuthHandlers,
	CognitoPasswordPolicy,
	CognitoAuthStatus,
	CognitoAuthStep,
	CognitoAuthTextOverrides,
	CognitoConfirmForgotPasswordPayload,
	CognitoConfirmSignUpPayload,
	CognitoForgotPasswordPayload,
	CognitoNewPasswordRequiredPayload,
	CognitoSignInPayload,
	CognitoSignUpPayload
} from "./types";

defineOptions({
	inheritAttrs: false
});

const props = withDefaults(
	defineProps<{
		initialStep?: CognitoAuthStep;
		initialEmail?: string;
		loading?: boolean;
		status?: CognitoAuthStatus | null;
		allowSignUp?: boolean;
		texts?: CognitoAuthTextOverrides;
		assets?: CognitoAuthAssets;
		handlers?: CognitoAuthHandlers;
		passwordPolicy: CognitoPasswordPolicy;
	}>(),
	{
		initialStep: "sign-in",
		initialEmail: "",
		loading: false,
		status: null,
		allowSignUp: false,
		texts: () => ({}),
		assets: () => ({}),
		handlers: () => ({})
	}
);

const emit = defineEmits<{
	stepChange: [step: CognitoAuthStep];
}>();

const step = ref<CognitoAuthStep>(
	props.initialStep === "sign-up" && !props.allowSignUp
		? "sign-in"
		: props.initialStep
);
const pending = ref(false);
const internalStatus = ref<CognitoAuthStatus | null>(null);
const lastEmail = ref(props.initialEmail);
const challengeSession = ref("");

const resolvedTexts = computed(() => ({
	...defaultCognitoAuthTexts,
	...props.texts
}));

const isLoading = computed(() => props.loading || pending.value);
const currentStatus = computed(() => props.status ?? internalStatus.value);

const title = computed(() => {
	switch (step.value) {
		case "sign-up":
			return resolvedTexts.value.signUpTitle;
		case "confirm-sign-up":
			return resolvedTexts.value.confirmSignUpTitle;
		case "forgot-password":
			return resolvedTexts.value.forgotPasswordTitle;
		case "confirm-forgot-password":
			return resolvedTexts.value.confirmForgotPasswordTitle;
		case "new-password-required":
			return resolvedTexts.value.newPasswordRequiredTitle;
		default:
			return resolvedTexts.value.signInTitle;
	}
});

const subtitle = computed(() => {
	switch (step.value) {
		case "sign-up":
			return resolvedTexts.value.signUpSubtitle;
		case "confirm-sign-up":
			return resolvedTexts.value.confirmSignUpSubtitle;
		case "forgot-password":
			return resolvedTexts.value.forgotPasswordSubtitle;
		case "confirm-forgot-password":
			return resolvedTexts.value.confirmForgotPasswordSubtitle;
		case "new-password-required":
			return resolvedTexts.value.newPasswordRequiredSubtitle;
		default:
			return resolvedTexts.value.signInSubtitle;
	}
});

watch(
	() => props.initialEmail,
	value => {
		lastEmail.value = value;
	}
);

watch(
	() => props.allowSignUp,
	value => {
		if (!value && step.value === "sign-up") {
			setStep("sign-in");
		}
	}
);

function setStep(next: CognitoAuthStep) {
	if (next === "sign-up" && !props.allowSignUp) {
		return;
	}

	step.value = next;
	internalStatus.value = null;
	emit("stepChange", next);
}

function setStatus(tone: CognitoAuthStatus["tone"], message: string) {
	internalStatus.value = { tone, message };
}

function getErrorMessage(error: unknown) {
	return error instanceof Error
		? error.message
		: resolvedTexts.value.genericError;
}

function applyResult(
	result: CognitoAuthActionResult | void,
	fallback?: () => void
) {
	if (result?.email !== undefined) {
		lastEmail.value = result.email;
	}

	if (result?.session !== undefined) {
		challengeSession.value = result.session;
	}

	if (result?.step) {
		setStep(result.step);
	}

	if (result?.status !== undefined) {
		internalStatus.value = result.status;
		return;
	}

	if (result?.step) {
		return;
	}

	fallback?.();
}

async function runAction(
	action: () => Promise<CognitoAuthActionResult | void>
) {
	pending.value = true;
	internalStatus.value = null;

	try {
		return await action();
	} catch (error) {
		setStatus("negative", getErrorMessage(error));
		return undefined;
	} finally {
		pending.value = false;
	}
}

async function handleSignIn(payload: CognitoSignInPayload) {
	lastEmail.value = payload.email;
	const result = await runAction(() =>
		Promise.resolve(props.handlers.onSignIn?.(payload))
	);
	applyResult(result);
}

async function handleSignUp(payload: CognitoSignUpPayload) {
	lastEmail.value = payload.email;
	const result = await runAction(() =>
		Promise.resolve(props.handlers.onSignUp?.(payload))
	);
	applyResult(result, () => {
		setStep("confirm-sign-up");
		setStatus("info", resolvedTexts.value.verificationCodeSent);
	});
}

async function handleConfirmSignUp(payload: CognitoConfirmSignUpPayload) {
	lastEmail.value = payload.email;
	const result = await runAction(() =>
		Promise.resolve(props.handlers.onConfirmSignUp?.(payload))
	);
	applyResult(result, () => {
		setStep("sign-in");
		setStatus("positive", resolvedTexts.value.accountVerified);
	});
}

async function handleForgotPassword(payload: CognitoForgotPasswordPayload) {
	lastEmail.value = payload.email;
	const result = await runAction(() =>
		Promise.resolve(props.handlers.onForgotPassword?.(payload))
	);
	applyResult(result, () => {
		setStep("confirm-forgot-password");
		setStatus("info", resolvedTexts.value.resetCodeSent);
	});
}

async function handleConfirmForgotPassword(
	payload: CognitoConfirmForgotPasswordPayload
) {
	lastEmail.value = payload.email;
	const result = await runAction(() =>
		Promise.resolve(props.handlers.onConfirmForgotPassword?.(payload))
	);
	applyResult(result, () => {
		setStep("sign-in");
		setStatus("positive", resolvedTexts.value.passwordUpdated);
	});
}

async function handleNewPasswordRequired(
	payload: CognitoNewPasswordRequiredPayload
) {
	lastEmail.value = payload.email;
	const result = await runAction(() =>
		Promise.resolve(props.handlers.onNewPasswordRequired?.(payload))
	);
	applyResult(result, () => {
		setStatus("positive", resolvedTexts.value.passwordSet);
	});
}

async function handleResendSignUpCode(email: string) {
	lastEmail.value = email;
	const result = await runAction(() =>
		Promise.resolve(props.handlers.onResendSignUpCode?.(email))
	);
	applyResult(result, () => {
		setStatus("info", resolvedTexts.value.codeResent);
	});
}

async function handleResendForgotPasswordCode(email: string) {
	lastEmail.value = email;
	const result = await runAction(() =>
		Promise.resolve(props.handlers.onResendForgotPasswordCode?.(email))
	);
	applyResult(result, () => {
		setStatus("info", resolvedTexts.value.resetCodeResent);
	});
}
</script>

<style lang="scss" scoped>
.cognito-auth {
	width: 100%;
	max-width: 460px;
	border: 1px solid rgba(125, 125, 125, 0.18);
	border-radius: 24px;
	box-shadow: 0 24px 80px rgba(0, 0, 0, 0.12);
	overflow: hidden;
}

.cognito-auth__logo {
	display: block;
	max-width: 180px;
	max-height: 96px;
	width: auto;
	height: auto;
	margin-right: auto;
	margin-left: auto;
}
</style>
