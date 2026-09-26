import type {
	UserAuthJson,
	UserInviteConfirmJson,
	UserRecoverConfirmJson,
	UserRecoverJson
} from "@sst-console/sdk";
import { useMutation, useQueryClient } from "@tanstack/vue-query";

import { api, handleApiError } from "@/boot/api-client";
import { useAuthStore } from "@/stores/auth";

export function useLogin() {
	const auth = useAuthStore();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: UserAuthJson) => api.login(input),
		onSuccess: result => {
			queryClient.clear();
			if ("accessToken" in result) auth.setSession(result);
		},
		onError: handleApiError
	});
}

export function useInviteConfirm() {
	const auth = useAuthStore();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: UserInviteConfirmJson) => api.inviteConfirm(input),
		onSuccess: session => {
			queryClient.clear();
			auth.setSession(session);
		},
		onError: handleApiError
	});
}

export function useRecover() {
	return useMutation({
		mutationFn: (input: UserRecoverJson) => api.recover(input),
		onError: handleApiError
	});
}

export function useRecoverConfirm() {
	return useMutation({
		mutationFn: (input: UserRecoverConfirmJson) =>
			api.recoverConfirm(input),
		onError: handleApiError
	});
}
