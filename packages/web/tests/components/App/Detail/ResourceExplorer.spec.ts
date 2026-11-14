import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ResourceExplorer from "@/components/App/Detail/Stage/Resources/ResourceExplorer.vue";
import { stageResources } from "../../../fixtures/stage-resources";

const stubs = {
	QCard: { template: "<div><slot /></div>" },
	QIcon: true,
	QInput: { props: ["disable"], template: '<input :disabled="disable" />' },
	QScrollArea: { template: "<div><slot /></div>" },
	QSkeleton: { template: "<div data-skeleton />" },
	QSpinner: true,
	QSeparator: { props: ["vertical"], template: "<div />" }
};

describe("ResourceExplorer", () => {
	it("keeps the header visible and shows a loading indicator", () => {
		const wrapper = mount(ResourceExplorer, {
			props: { resources: [], loading: true },
			global: { stubs, mocks: { $q: { screen: { lt: { sm: false } } } } }
		});
		expect(wrapper.find("[data-skeleton]").exists()).toBe(true);
		expect(wrapper.text()).toContain("Resource inspector");
		expect(wrapper.find("input").attributes("disabled")).toBeDefined();
		expect(wrapper.find('[role="status"]').attributes("aria-label")).toBe(
			"Loading resources"
		);
		expect(wrapper.text()).not.toContain("No resources discovered");
	});

	it("shows its own empty state when no resources exist", () => {
		const wrapper = mount(ResourceExplorer, {
			props: { resources: [] },
			global: { stubs }
		});
		expect(wrapper.text()).toContain("No resources discovered");
	});

	it.each([
		{ mobile: true, direction: "column", treeSize: "col" },
		{ mobile: false, direction: "row", treeSize: "col-sm-5" }
	])(
		"lays out scroll areas for mobile=$mobile",
		({ mobile, direction, treeSize }) => {
			const wrapper = mount(ResourceExplorer, {
				props: { resources: stageResources },
				global: {
					stubs,
					mocks: { $q: { screen: { lt: { sm: mobile } } } }
				}
			});
			const areas = wrapper.findAllComponents(stubs.QScrollArea);
			expect(wrapper.find('[role="status"]').exists()).toBe(false);
			expect(
				wrapper.find("input").attributes("disabled")
			).toBeUndefined();
			expect(wrapper.find("[data-skeleton]").exists()).toBe(false);
			expect(areas).toHaveLength(2);
			expect(areas.map(area => area.attributes("aria-label"))).toEqual([
				"Resource tree",
				"Resource details"
			]);
			expect(
				areas.every(area => area.classes().includes("absolute-full"))
			).toBe(true);
			expect(
				areas[0]!.element.parentElement?.classList.contains(treeSize)
			).toBe(true);
			expect(
				areas[0]!.element.parentElement?.parentElement?.classList.contains(
					direction
				)
			).toBe(true);
			expect(
				wrapper
					.findAllComponents(stubs.QSeparator)[1]!
					.props("vertical")
			).toBe(!mobile);
		}
	);
});
