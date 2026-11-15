import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/db", () => ({ db: {} }));

const { resourceTree } = await import("../../src/app/index");

describe("resource tree", () => {
	it("keeps orphans and cyclic relationships visible exactly once", () => {
		const tree = resourceTree([
			{ resourceId: "root" },
			{ resourceId: "child", parentResourceId: "root" },
			{ resourceId: "orphan", parentResourceId: "missing" },
			{ resourceId: "a", parentResourceId: "b" },
			{ resourceId: "b", parentResourceId: "a" }
		]);
		expect(tree.map(item => item.resourceId)).toEqual([
			"root",
			"orphan",
			"a",
			"b"
		]);
		expect(tree[0]?.children.map(item => item.resourceId)).toEqual([
			"child"
		]);
	});
});
