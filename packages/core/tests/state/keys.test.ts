import { describe, expect, it } from "vitest";
import {
	parseStateKey,
	parseUpdateKey,
	stateObjectKey,
	updateObjectKey
} from "../../src/state/keys";

describe("SST artifact keys", () => {
	it("round-trips current State and Update keys", () => {
		const state = stateObjectKey("shop", "prod");
		const update = updateObjectKey("shop", "prod", "123");
		expect(parseStateKey(state)).toEqual({
			appName: "shop",
			stageName: "prod",
			key: state
		});
		expect(parseUpdateKey(update)).toEqual({
			appName: "shop",
			stageName: "prod",
			updateId: "123",
			key: update
		});
	});

	it("preserves the existing distinct Stage parsing rules", () => {
		expect(parseStateKey("app/shop/nested/prod.json")?.stageName).toBe(
			"nested/prod"
		);
		expect(
			parseUpdateKey("update/shop/nested/prod/123.json")
		).toBeUndefined();
	});
});
