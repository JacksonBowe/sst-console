import { describe, expect, it } from "vitest";

import routes from "@/router/routes";

describe("stage Function route", () => {
	it("uses dedicated named route before generic resource routes", () => {
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
	});
});
