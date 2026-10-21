import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { Notify } from "quasar";
import { toValue, type MaybeRefOrGetter } from "vue";

import { api, handleApiError } from "@/boot/api-client";

export const appQueryKeys = {
	all: ["apps"] as const,
	detail: (appName: string) => ["apps", appName] as const,
	stage: (appName: string, stageName: string) =>
		["stages", appName, stageName] as const
};

export function useApps() {
	return useQuery({
		queryKey: appQueryKeys.all,
		queryFn: () => api.listApps({ summaries: true })
	});
}

export function useApp(appName: MaybeRefOrGetter<string>) {
	return useQuery({
		queryKey: () => appQueryKeys.detail(toValue(appName)),
		queryFn: () => api.getApp(toValue(appName)),
		enabled: () => Boolean(toValue(appName))
	});
}

export function useStage(
	appName: MaybeRefOrGetter<string>,
	stageName: MaybeRefOrGetter<string>
) {
	return useQuery({
		queryKey: () =>
			appQueryKeys.stage(toValue(appName), toValue(stageName)),
		queryFn: () => api.getStage(toValue(appName), toValue(stageName)),
		enabled: () => Boolean(toValue(appName) && toValue(stageName))
	});
}

export function useSetStageIssueMonitoring() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			appName,
			stageName,
			enabled
		}: {
			appName: string;
			stageName: string;
			enabled: boolean;
		}) => api.setStageIssueMonitoring(appName, stageName, enabled),
		onSuccess: async (_result, { appName, stageName, enabled }) => {
			Notify.create({
				message: enabled
					? "Issue monitoring enabled; reconciliation queued"
					: "Issue monitoring disabled; filter removal queued",
				color: "positive"
			});
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: appQueryKeys.all }),
				queryClient.invalidateQueries({
					queryKey: appQueryKeys.stage(appName, stageName)
				})
			]);
		},
		onError: handleApiError
	});
}
