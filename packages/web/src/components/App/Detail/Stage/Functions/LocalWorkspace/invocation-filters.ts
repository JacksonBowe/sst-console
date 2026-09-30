import type { Filters } from "@/components/ui/Table";
import type { LocalInvocation } from "@/composables/local";
import { localInvocationStatusDisplay } from "@/composables/local";

export const invocationStatusOptions = [
	{ label: "Running", value: "running" },
	{ label: "Success", value: "success" },
	{ label: "Error", value: "error" }
];

export function filterInvocations(
	invocations: LocalInvocation[],
	filters: Filters
) {
	const text = filters.text.trim().toLowerCase();
	const statuses = filters.facets.status ?? [];

	return invocations.filter(invocation => {
		if (statuses.length) {
			const status = localInvocationStatusDisplay(
				invocation.status
			).label.toLowerCase();
			if (!statuses.includes(status)) return false;
		}

		if (!text) return true;
		const functionName = invocation.source?.split("::").at(-1) ?? "";
		const route = invocation.http
			? `${invocation.http.method} ${invocation.http.path}`
			: "";

		return [functionName, route].some(value =>
			value.toLowerCase().includes(text)
		);
	});
}
