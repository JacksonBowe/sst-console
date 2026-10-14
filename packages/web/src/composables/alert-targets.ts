import { useQuery } from "@tanstack/vue-query";

import { api } from "@/boot/api-client";

export function useAlertTargets() {
	return useQuery({
		queryKey: ["alert-targets"],
		queryFn: () => api.listAlertTargets()
	});
}
