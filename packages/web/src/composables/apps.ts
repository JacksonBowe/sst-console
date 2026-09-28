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
