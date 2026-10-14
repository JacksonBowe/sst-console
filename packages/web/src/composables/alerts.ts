import { useQuery } from "@tanstack/vue-query";

import { api } from "@/boot/api-client";

export function useAlerts() {
	return useQuery({
		queryKey: ["alerts"],
		queryFn: () => api.listAlerts()
	});
}
