import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { HistoryKey } from "@sst-console/sdk";
import { toValue, type MaybeRefOrGetter } from "vue";

import { api } from "@/boot/api-client";

export const historyQueryKeys = {
	stage: (key: HistoryKey) =>
		["state-history", key.accountId, key.appName, key.stageName] as const,
	detail: (key: HistoryKey, updateId: string) =>
		[...historyQueryKeys.stage(key), "detail", updateId] as const
};

export function useStateHistory(
	key: MaybeRefOrGetter<HistoryKey>,
	enabled: MaybeRefOrGetter<boolean>
) {
	return useQuery({
		queryKey: () => [...historyQueryKeys.stage(toValue(key)), "artifacts"],
		queryFn: () =>
			api.listStageUpdates(toValue(key).appName, toValue(key).stageName),
		enabled: () => toValue(enabled) && Boolean(toValue(key).accountId)
	});
}

export function useStateUpdateDetail(
	key: MaybeRefOrGetter<HistoryKey>,
	updateId: MaybeRefOrGetter<string>
) {
	return useQuery({
		queryKey: () =>
			historyQueryKeys.detail(toValue(key), toValue(updateId)),
		queryFn: () =>
			api.getStageUpdate(
				toValue(key).appName,
				toValue(key).stageName,
				toValue(updateId)
			),
		enabled: () => Boolean(toValue(key).accountId && toValue(updateId))
	});
}

export function useDiscoverStateHistory() {
	const client = useQueryClient();
	return useMutation({
		mutationFn: (key: HistoryKey) => api.discoverStateHistory(key),
		onSuccess: async (_result, key) =>
			client.invalidateQueries({ queryKey: historyQueryKeys.stage(key) })
	});
}

export function useProcessStateHistory() {
	const client = useQueryClient();
	return useMutation({
		mutationFn: ({
			key,
			updateId
		}: {
			key: HistoryKey;
			updateId: string;
		}) => api.processStateHistory(key, updateId),
		onSuccess: async (_result, { key }) =>
			client.invalidateQueries({ queryKey: historyQueryKeys.stage(key) })
	});
}
