import { defineBoot } from "#q-app";
import { type ApiClient, ApiError, createClient } from "@sst-console/sdk";
import { Notify } from "quasar";

import { queryClient } from "./vue-query";
import { useAuthStore } from "@/stores/auth";

export let api: ApiClient;

export function handleApiError(error: unknown): void {
	const message =
		error instanceof ApiError
			? error.message
			: "An unexpected error occurred";

	Notify.create({
		message,
		color:
			error instanceof ApiError && error.status && error.status < 500
				? "warning"
				: "negative",
		timeout: 4000
	});
}

export default defineBoot(async ({ router }) => {
	const auth = useAuthStore();
	auth.hydrate();

	api = createClient({
		baseUrl: import.meta.env.VITE_API_ENDPOINT!,
		getAccessToken: () => {
			auth.hydrate();
			return auth.session?.accessToken;
		},
		refreshSession: async () => {
			if (!auth.session?.refreshToken) {
				throw new Error("Missing refresh token");
			}

			const session = await api.refresh({
				refreshToken: auth.session.refreshToken
			});
			auth.updateSession(session);
			return session;
		},
		onAuthFailure: async () => {
			auth.clearSession();
			queryClient.clear();
			await router.replace("/login");
		}
	});

	if (!auth.session) return;
	if (!auth.session.refreshToken) {
		auth.clearSession();
		return;
	}

	try {
		const session = await api.refresh({
			refreshToken: auth.session.refreshToken
		});
		auth.updateSession(session);
	} catch {
		auth.clearSession();
		queryClient.clear();
	}
});
