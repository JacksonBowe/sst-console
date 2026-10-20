import type { AlertRuleInput } from "@sst-console/sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

import { api, handleApiError } from "@/boot/api-client";

export const alertRuleQueryKeys = {
	all: ["alert-rules"] as const
};

export function useAlertRules() {
	return useQuery({
		queryKey: alertRuleQueryKeys.all,
		queryFn: () => api.listAlertRules()
	});
}

export function useRemoveAlertRule() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => api.removeAlertRule(id),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: alertRuleQueryKeys.all }),
		onError: handleApiError
	});
}

export function useCreateAlertRule() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: AlertRuleInput) => api.createAlertRule(input),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: alertRuleQueryKeys.all }),
		onError: handleApiError
	});
}

export function useUpdateAlertRule() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, input }: { id: string; input: AlertRuleInput }) =>
			api.updateAlertRule(id, input),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: alertRuleQueryKeys.all }),
		onError: handleApiError
	});
}
