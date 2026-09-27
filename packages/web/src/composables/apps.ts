import { useQuery } from "@tanstack/vue-query";
import { toValue, type MaybeRefOrGetter } from "vue";

import { api } from "@/boot/api-client";

export const appQueryKeys = {
	all: ["apps"] as const,
	detail: (appName: string) => ["apps", appName] as const,
	stage: (appName: string, stageName: string) =>
		["stages", appName, stageName] as const
};

export function useApps() {
	return useQuery({
		queryKey: appQueryKeys.all,
		queryFn: () => api.listApps()
	});
}

export function useApp(appName: MaybeRefOrGetter<string>) {
	return useQuery({
		queryKey: () => appQueryKeys.detail(toValue(appName)),
		queryFn: () => api.getApp(toValue(appName)),
		enabled: () => Boolean(toValue(appName))
	});
}

export function useStage(appName: string, stageName: string) {
	return useQuery({
		queryKey: appQueryKeys.stage(appName, stageName),
		queryFn: () => api.getStage(appName, stageName),
		enabled: Boolean(appName && stageName)
	});
}
