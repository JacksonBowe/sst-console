<template>
	<CognitoAuth class="full-width" :handlers="handlers" />
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";

import { CognitoAuth, type CognitoAuthHandlers } from "@/components/ui/Auth";
import {
	useInviteConfirm,
	useLogin,
	useRecover,
	useRecoverConfirm
} from "@/composables/auth";

const router = useRouter();
const login = useLogin();
const inviteConfirm = useInviteConfirm();
const recover = useRecover();
const recoverConfirm = useRecoverConfirm();

const handlers: CognitoAuthHandlers = {
	onSignIn: async payload => {
		const result = await login.mutateAsync(payload);

		if ("accessToken" in result) {
			await router.replace("/");
			return;
		}

		if (!result.session) throw new Error("Missing invitation session.");

		return {
			email: payload.email,
			session: result.session,
			step: "new-password-required"
		};
	},
	onForgotPassword: async payload => {
		await recover.mutateAsync(payload);

		return {
			email: payload.email,
			step: "confirm-forgot-password"
		};
	},
	onConfirmForgotPassword: async payload => {
		await recoverConfirm.mutateAsync(payload);

		return {
			email: payload.email,
			step: "sign-in"
		};
	},
	onNewPasswordRequired: async payload => {
		await inviteConfirm.mutateAsync(payload);
		await router.replace("/");
	},
	onResendForgotPasswordCode: async email => {
		await recover.mutateAsync({ email });
		return { email };
	}
};
</script>
