import { describe, expect, it } from "vitest";

import {
	functionResourcesFor,
	getStageResourceCategory,
	resourcesForStageCategory,
	stageResourceCategoriesFor
} from "@/composables/apps/stage-resources";
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

	it("finds Function resources without retaining non-Function ancestors", () => {
		expect(
			functionResourcesFor(stageResources).map(item => item.resourceId)
		).toEqual(["handler"]);
	});

	it("rejects categories without a resource contract", () => {
		expect(getStageResourceCategory("apis")).toBeUndefined();
	});
});
