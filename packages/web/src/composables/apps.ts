import { useQuery } from "@tanstack/vue-query";

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

export function useApp(appName: string) {
	return useQuery({
		queryKey: appQueryKeys.detail(appName),
		queryFn: () => api.getApp(appName),
		enabled: Boolean(appName)
	});
}

export function useStage(appName: string, stageName: string) {
	return useQuery({
		queryKey: appQueryKeys.stage(appName, stageName),
		queryFn: () => api.getStage(appName, stageName),
		enabled: Boolean(appName && stageName)
	});
}
