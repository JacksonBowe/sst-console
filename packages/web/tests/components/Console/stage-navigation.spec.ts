import { describe, expect, it } from "vitest";

import {
	getStageResourceCategory,
	resourcesForStageCategory,
	stageResourceCategoriesFor
} from "@/components/Console/stage-navigation";
import { stageResources } from "../../fixtures/stage-resources";

describe("stage resource navigation", () => {
	it("lists only discovered resource categories with a supported contract", () => {
		expect(
			stageResourceCategoriesFor(stageResources).map(item => item.key)
		).toEqual(["functions", "dynamodb", "s3", "cognito"]);
	});

	it("retains ancestor context when a selected category is nested", () => {
		const resources = resourcesForStageCategory(
			stageResources,
			"functions"
		);

		expect(resources).toHaveLength(1);
		expect(resources[0]?.resourceId).toBe("api");
		expect(
			resources[0]?.children.map(resource => resource.resourceId)
		).toEqual(["handler"]);
	});

	it("rejects categories without a resource contract", () => {
		expect(getStageResourceCategory("apis")).toBeUndefined();
	});
});
