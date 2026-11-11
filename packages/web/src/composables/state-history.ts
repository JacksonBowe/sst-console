import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { HistoryKey } from "@sst-console/sdk";
import { toValue, type MaybeRefOrGetter } from "vue";

import { api } from "@/boot/api-client";

export const historyQueryKeys = {
	stage: (key: HistoryKey) =>
		["state-history", key.accountId, key.appName, key.stageName] as const,
	events: (key: HistoryKey, updateId: string) =>
		[...historyQueryKeys.stage(key), "events", updateId] as const
};

export function useStateHistory(
	key: MaybeRefOrGetter<HistoryKey>,
	enabled: MaybeRefOrGetter<boolean>
) {
	return useQuery({
		queryKey: () => [...historyQueryKeys.stage(toValue(key)), "artifacts"],
		queryFn: async () => {
			const current = toValue(key);
			const [updates, snapshots, logs] = await Promise.all([
				api.listStateUpdates(current),
				api.listStateSnapshots(current),
				api.listStateEventLogs(current)
			]);
			return { updates, snapshots, logs };
		},
		enabled: () => toValue(enabled) && Boolean(toValue(key).accountId)
	});
}

export function useStateResourceEvents(
	key: MaybeRefOrGetter<HistoryKey>,
	updateId: MaybeRefOrGetter<string>
) {
	return useQuery({
		queryKey: () =>
			historyQueryKeys.events(toValue(key), toValue(updateId)),
		queryFn: () =>
			api.listStateResourceEvents(toValue(key), toValue(updateId)),
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
