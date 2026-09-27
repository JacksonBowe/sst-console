import type { InviteUserInput, UsersFilters } from "@sst-console/sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

import { api } from "@/boot/api-client";

export const userQueryKeys = {
	all: ["users"] as const,
	list: (filters: UsersFilters) => ["users", filters] as const
};

export function useUsers(filters: UsersFilters = {}) {
	return useQuery({
		queryKey: userQueryKeys.list(filters),
		queryFn: () => api.listUsers(filters)
	});
}

export function useInviteUser() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: InviteUserInput) => api.inviteUser(input),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: userQueryKeys.all })
	});
}

export function useRemoveUser() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => api.removeUser(id),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: userQueryKeys.all })
	});
}
