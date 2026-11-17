import { describe, expect, it } from "vitest";
import type { Issue } from "@sst-console/sdk";
import { filterIssues } from "@/components/Monitoring/Issues/issue-filters";
import type { Filters } from "@/components/ui/Table";

const issues = [
	{
		appName: "shop",
		stageName: "prod",
		status: "open",
		errorType: "Error",
		errorMessage: "Payment failed",
		functionName: "charge",
		logGroup: "logs",
		count: 4,
		lastSeenAt: "2026-10-21"
	},
	{
		appName: "shop",
		stageName: "dev",
		status: "resolved",
		errorType: "Timeout",
		errorMessage: "Slow request",
		logGroup: "api-logs",
		count: 2,
		lastSeenAt: "2026-10-20"
	},
	{
		appName: "admin",
		stageName: "prod",
		status: "open",
		errorType: "Error",
		errorMessage: "Login failed",
		logGroup: "auth",
		count: 1,
		lastSeenAt: "2026-10-19"
	}
] as Issue[];
const filters = (facets: Filters["facets"] = {}, text = ""): Filters => ({
	text,
	facets
});

describe("issue filtering", () => {
	it("combines app, stage, status and text filters", () => {
		expect(
			filterIssues(
				issues,
				filters(
					{
						appName: ["shop"],
						stageName: ["prod"],
						status: ["open"]
					},
					"PAYMENT"
				)
			)
		).toEqual([issues[0]]);
	});
	it("supports multiple facet values and workload search", () => {
		expect(
			filterIssues(
				issues,
				filters({ status: ["open", "resolved"] }, "api-logs")
			)
		).toEqual([issues[1]]);
	});
	it("returns no results for unmatched filters and all results after clearing", () => {
		expect(
			filterIssues(issues, filters({ stageName: ["missing"] }))
		).toEqual([]);
		expect(filterIssues(issues, filters())).toEqual(issues);
	});
});
