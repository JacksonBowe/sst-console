import { useMutation, useQueryClient } from "@tanstack/vue-query";

import { api } from "@/boot/api-client";

import { accountQueryKeys } from "./accounts";
import { appQueryKeys } from "./apps";

export function useRecoverAccounts() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => api.recoverAccounts(),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: accountQueryKeys.all
				}),
				queryClient.invalidateQueries({ queryKey: appQueryKeys.all })
			]);
		}
	});
}

export function useBackupConnections() {
	return useMutation({ mutationFn: () => api.backupConnections() });
}
