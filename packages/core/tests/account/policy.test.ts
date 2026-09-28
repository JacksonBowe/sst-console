import { describe, expect, it } from "vitest";

import { includesStage, matchesStageSelector } from "../../src/account/policy";

describe("account sync policy", () => {
	it("matches exact selectors and restricted single-star globs", () => {
		expect(
			matchesStageSelector(
				{ app: "console-*", stage: "prod" },
				{ appName: "console-web", stageName: "prod" }
			)
		).toBe(true);
		expect(
			matchesStageSelector(
				{ app: "console-*", stage: "prod" },
				{ appName: "console-web", stageName: "dev" }
			)
		).toBe(false);
	});

	it("defaults to all entries and lets ignore rules override allow rules", () => {
		const stage = { appName: "console", stageName: "prod" };
		expect(includesStage({ allowList: [], ignoreList: [] }, stage)).toBe(
			true
		);
		expect(
			includesStage(
				{
					allowList: [{ app: "console" }],
					ignoreList: [{ app: "console", stage: "prod" }]
				},
				stage
			)
		).toBe(false);
	});
});
