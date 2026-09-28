import type { AccountSyncPolicy } from "@sst-console/sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

import { api } from "@/boot/api-client";

import { appQueryKeys } from "./apps";

export const accountQueryKeys = {
	all: ["accounts"] as const,
	detail: (accountId: string) => ["accounts", accountId] as const,
	manageApps: (accountId: string) =>
		["accounts", accountId, "manage-apps"] as const
};

export function useAccounts() {
	return useQuery({
		queryKey: accountQueryKeys.all,
		queryFn: () => api.listAccounts()
	});
}

export function useAccount(accountId: string) {
	return useQuery({
		queryKey: accountQueryKeys.detail(accountId),
		queryFn: () => api.getAccount(accountId),
		enabled: Boolean(accountId)
	});
}

export function useSyncAccount() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (accountId: string) => api.syncAccount(accountId),
		onSuccess: async (result, accountId) => {
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: accountQueryKeys.all
				}),
				queryClient.invalidateQueries({
					queryKey: accountQueryKeys.detail(accountId)
				}),
				queryClient.invalidateQueries({ queryKey: appQueryKeys.all }),
				...result.states.flatMap(state => [
					queryClient.invalidateQueries({
						queryKey: appQueryKeys.detail(state.app)
					}),
					queryClient.invalidateQueries({
						queryKey: appQueryKeys.stage(state.app, state.stage)
					})
				])
			]);
		}
	});
}

export function useManageAccountApps(accountId: string) {
	return useQuery({
		queryKey: accountQueryKeys.manageApps(accountId),
		queryFn: () => api.getManageAccountApps(accountId),
		enabled: Boolean(accountId)
	});
}

export function useRefreshAccountDiscovery() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (accountId: string) =>
			api.refreshAccountDiscovery(accountId),
		onSuccess: async (_result, accountId) =>
			queryClient.invalidateQueries({
				queryKey: accountQueryKeys.manageApps(accountId)
			})
	});
}

export function useApplyAccountSyncPolicy() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			accountId,
			policy
		}: {
			accountId: string;
			policy: AccountSyncPolicy;
		}) => api.applyAccountSyncPolicy(accountId, policy),
		onSuccess: async (result, { accountId }) => {
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: accountQueryKeys.all
				}),
				queryClient.invalidateQueries({
					queryKey: accountQueryKeys.detail(accountId)
				}),
				queryClient.invalidateQueries({
					queryKey: accountQueryKeys.manageApps(accountId)
				}),
				queryClient.invalidateQueries({ queryKey: appQueryKeys.all }),
				...result.states.flatMap(state => [
					queryClient.invalidateQueries({
						queryKey: appQueryKeys.detail(state.app)
					}),
					queryClient.invalidateQueries({
						queryKey: appQueryKeys.stage(state.app, state.stage)
					})
				])
			]);
		}
	});
}
