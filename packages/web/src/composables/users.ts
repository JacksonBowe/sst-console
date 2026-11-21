import { api, handleApiError } from "@/boot/api-client";
import { successNotify } from "@/components/ui/toast";
import type { InviteUserInput } from "@sst-console/sdk";
import {
	useInfiniteQuery,
	useMutation,
	useQueryClient
} from "@tanstack/vue-query";
import { useAutoFetchAllPages } from "./useAutoFetchAllPages";

export const userQueryKeys = {
	all: ["users"] as const
};

export function useUsers() {
	const query = useInfiniteQuery({
		queryKey: userQueryKeys.all,
		initialPageParam: undefined as string | undefined,
		queryFn: ({ pageParam }) =>
			api.listUsers({
				limit: 100,
				...(pageParam ? { cursor: pageParam } : {})
			}),
		getNextPageParam: page => page.meta.nextCursor ?? undefined
	});
	useAutoFetchAllPages(query);
	return query;
}

export function useInviteUser() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: InviteUserInput) => api.inviteUser(input),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: userQueryKeys.all }),
		onError: handleApiError
	});
}

export function useRemoveUser() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => api.removeUser(id),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: userQueryKeys.all }),
		onError: handleApiError
	});
}

export function useSetUserEnabled() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
			api.setUserEnabled(id, enabled),
		onSuccess: (_data, { enabled }) =>
			successNotify(`User ${enabled ? "enabled" : "disabled"}`),
		onSettled: async (_data, error) => {
			await queryClient.invalidateQueries({
				queryKey: userQueryKeys.all
			});
			if (error) return;
		},
		onError: handleApiError
	});
}
