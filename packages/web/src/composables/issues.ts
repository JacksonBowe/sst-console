import type { Issue, IssuesFilters, IssueStatus } from "@sst-console/sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { toValue, type MaybeRefOrGetter } from "vue";

import { api, handleApiError } from "@/boot/api-client";
import { Notify } from "quasar";

import { appQueryKeys } from "./apps";

export const issueQueryKeys = {
	all: ["issues"] as const
};

export function useIssues(filters: MaybeRefOrGetter<IssuesFilters>) {
	return useQuery({
		queryKey: () => [...issueQueryKeys.all, toValue(filters)],
		queryFn: () => api.listIssues(toValue(filters))
	});
}

export function useSetIssueStatus() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			issue,
			status
		}: {
			issue: Issue;
			status: IssueStatus;
		}) => api.setIssueStatus(issue, status),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: issueQueryKeys.all }),
		onError: handleApiError
	});
}

export function usePurgeIssues() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => api.purgeIssues(),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: issueQueryKeys.all }),
		onError: handleApiError
	});
}

export function useDisableAllIssueMonitoring() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => api.disableAllIssueMonitoring(),
		onSuccess: async ({ disabled }) => {
			Notify.create({
				message: `Monitoring disabled on ${disabled} ${disabled === 1 ? "stage" : "stages"}`,
				color: "positive"
			});
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: issueQueryKeys.all }),
				queryClient.invalidateQueries({ queryKey: appQueryKeys.all })
			]);
		},
		onError: handleApiError
	});
}
