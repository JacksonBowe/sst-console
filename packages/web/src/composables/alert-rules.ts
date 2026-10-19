import { useQuery } from "@tanstack/vue-query";

import { api } from "@/boot/api-client";

export function useAlertRules() {
	return useQuery({
		queryKey: ["alert-rules"],
		queryFn: () => api.listAlertRules()
	});
}
