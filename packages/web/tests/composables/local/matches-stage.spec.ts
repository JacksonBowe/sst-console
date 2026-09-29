import { describe, expect, it } from "vitest";

import { localSessionMatchesStage } from "@/composables/local";

const stage = {
	appName: "console",
	stageName: "dev",
	region: "us-east-1"
};

describe("Function page mode selection", () => {
	it("selects Local content only for matching app, stage, and region", () => {
		expect(
			localSessionMatchesStage(
				{ app: "console", stage: "dev", region: "us-east-1" },
				stage
			)
		).toBe(true);
	});

	it("rejects non-matching and absent session identities", () => {
		expect(
			localSessionMatchesStage(
				{ app: "console", stage: "prod", region: "us-east-1" },
				stage
			)
		).toBe(false);
		expect(localSessionMatchesStage(undefined, stage)).toBe(false);
	});
});
