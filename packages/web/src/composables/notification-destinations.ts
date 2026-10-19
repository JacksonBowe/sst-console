import { useQuery } from "@tanstack/vue-query";

import { api } from "@/boot/api-client";

export function useNotificationDestinations() {
	return useQuery({
		queryKey: ["notification-destinations"],
		queryFn: () => api.listNotificationDestinations()
	});
}
