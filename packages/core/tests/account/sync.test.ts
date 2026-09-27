import { describe, expect, it } from "vitest";

import { partitionStageOwnership } from "../../src/account/ownership";

describe("stage ownership conflicts", () => {
	it("keeps matching stages and skips stages owned by another account", () => {
		const current = {
			appName: "console",
			stageName: "local"
		};
		const stale = {
			appName: "simple-certify-web",
			stageName: "prod"
		};

		const result = partitionStageOwnership("691249328599", [
			[current, { accountId: "691249328599" }],
			[stale, { accountId: "208194581464" }]
		]);

		expect(result.projections).toEqual([current]);
		expect(result.conflicts).toEqual([
			{
				appName: "simple-certify-web",
				stageName: "prod",
				ownerAccountId: "208194581464"
			}
		]);
	});
});
