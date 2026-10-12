import type { IssuesFilters } from "@sst-console/sdk";
import { useQuery } from "@tanstack/vue-query";
import { toValue, type MaybeRefOrGetter } from "vue";

import { api } from "@/boot/api-client";

export function useIssues(filters: MaybeRefOrGetter<IssuesFilters>) {
	return useQuery({
		queryKey: () => ["issues", toValue(filters)],
		queryFn: () => api.listIssues(toValue(filters))
	});
}
