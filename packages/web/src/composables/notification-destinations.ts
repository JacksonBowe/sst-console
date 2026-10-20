import type {
	NotificationDestination,
	NotificationDestinationInput
} from "@sst-console/sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { Notify } from "quasar";

import { api, handleApiError } from "@/boot/api-client";

export const notificationDestinationQueryKeys = {
	all: ["notification-destinations"] as const
};

export function useNotificationDestinations() {
	return useQuery({
		queryKey: notificationDestinationQueryKeys.all,
		queryFn: () => api.listNotificationDestinations()
	});
}

export function useTestNotificationDestination() {
	return useMutation({
		mutationFn: (target: NotificationDestination) =>
			api.testNotificationDestination(target.id),
		onSuccess: (_result, target) =>
			Notify.create({
				message: `Test notification sent to ${target.name}`,
				color: "positive"
			}),
		onError: handleApiError
	});
}

export function useRemoveNotificationDestination() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => api.removeNotificationDestination(id),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: notificationDestinationQueryKeys.all
			}),
		onError: handleApiError
	});
}

export function useCreateNotificationDestination() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: NotificationDestinationInput) =>
			api.createNotificationDestination(input),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: notificationDestinationQueryKeys.all
			}),
		onError: handleApiError
	});
}

export function useUpdateNotificationDestination() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			id,
			input
		}: {
			id: string;
			input: NotificationDestinationInput;
		}) => api.updateNotificationDestination(id, input),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: notificationDestinationQueryKeys.all
			}),
		onError: handleApiError
	});
}
