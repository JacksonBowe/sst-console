import type { Issue } from "@sst-console/sdk";
import type { Filters } from "@/components/ui/Table";

/** Match the fields shown in the issue list and details. */
export const filterIssues = (issues: Issue[], filters: Filters): Issue[] => {
	const search = (filters.text ?? "").trim().toLowerCase();
	return issues.filter(issue => {
		for (const field of ["appName", "stageName", "status"] as const) {
			const selected = filters.facets[field];
			if (selected?.length && !selected.includes(issue[field]))
				return false;
		}
		return (
			!search ||
			[
				issue.errorType,
				issue.errorMessage,
				`${issue.appName}/${issue.stageName}`,
				issue.functionName ?? issue.logGroup,
				String(issue.count),
				issue.lastSeenAt,
				issue.status
			].some(value => value.toLowerCase().includes(search))
		);
	});
};
