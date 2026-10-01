import { describe, expect, it } from "vitest";

import routes from "@/router/routes";

describe("stage routes", () => {
	it("uses dedicated Functions and local workspace routes", () => {
		const stageRoutes = routes[0]?.children ?? [];
		const functionsRoute = stageRoutes.find(
			route => route.name === "stage-functions"
		);

		expect(functionsRoute?.path).toBe(
			"apps/:appName/stages/:stageName/functions"
		);
		expect(functionsRoute?.component).toBeTypeOf("function");
		expect(
			stageRoutes.find(route => route.name === "stage-resource")?.path
		).not.toContain("functions");
		expect(
			stageRoutes.find(route => route.name === "stage-local-workspace")
				?.path
		).toBe("apps/:appName/stages/:stageName/local");
		expect(
			stageRoutes.find(route => route.name === "local-workspace")?.path
		).toBe("local");
	});
});
