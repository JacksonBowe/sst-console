import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import type { ResourceTree as Resource } from "@sst-console/sdk";
import ResourceTree from "@/components/App/Detail/Stage/Resources/ResourceTree.vue";

function resource(
	name: string,
	type: string,
	children: Resource[] = []
): Resource {
	return {
		accountId: "123456789012",
		appName: "app",
		stageName: "prod",
		resourceId: name,
		resourceKind: "component",
		resourceType: type,
		urn: name,
		name,
		children,
		createdAt: "2026-01-01",
		updatedAt: "2026-01-01"
	};
}

describe("resource tree groups", () => {
	it("sorts roots naturally within each heading without reordering children", () => {
		const wrapper = mount(ResourceTree, {
			props: {
				resources: [
					resource("zeta", "sst.aws.Function", [
						resource("z-child", "aws:role:Role"),
						resource("a-child", "aws:role:Role")
					]),
					resource("Pool10", "aws:cognito:Pool"),
					resource("Alpha", "sst.aws.Function"),
					resource("pool2", "aws:cognito:Pool"),
					resource("LinkZ", "sst:sst:LinkRef"),
					resource("LinkA", "sst:sst:LinkRef")
				],
				expandedIds: new Set(["zeta"]),
				searching: true
			},
			global: { stubs: { QIcon: true } }
		});
		expect(
			wrapper.findAll('[role="treeitem"]').map(item => item.text())
		).toEqual([
			"Alpha",
			"zeta",
			"z-child",
			"a-child",
			"pool2",
			"Pool10",
			"LinkA",
			"LinkZ"
		]);
	});

	it("groups root resources and keeps support entries collapsed until searched", () => {
		const wrapper = mount(ResourceTree, {
			props: {
				resources: [
					resource("Api", "sst.aws.Function", [
						resource("Lambda", "aws:lambda/function:Function")
					]),
					resource("Branch", "neon:index/branch:Branch"),
					resource("Link", "sst:sst:LinkRef")
				],
				expandedIds: new Set<string>(),
				searching: false
			},
			global: { stubs: { QIcon: true } }
		});
		expect(wrapper.text()).toContain("SST components");
		expect(wrapper.text()).toContain("neon");
		expect(wrapper.text()).not.toContain("Lambda");
		expect(wrapper.text()).not.toContain("Link");
		const searched = mount(ResourceTree, {
			props: {
				...wrapper.props(),
				searching: true,
				expandedIds: new Set(["Api"])
			},
			global: { stubs: { QIcon: true } }
		});
		expect(searched.text()).toContain("Lambda");
		expect(searched.text()).toContain("Link");
	});
});
