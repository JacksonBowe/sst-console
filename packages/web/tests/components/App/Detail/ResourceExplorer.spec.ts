import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ResourceExplorer from "@/components/App/Detail/Stage/Resources/ResourceExplorer.vue";

const stubs = {
	QCard: { template: "<div><slot /></div>" },
	QIcon: true,
	QSkeleton: { template: "<div data-skeleton />" },
	QSeparator: true
};

describe("ResourceExplorer", () => {
	it("shows its own loading skeleton instead of an empty state", () => {
		const wrapper = mount(ResourceExplorer, {
			props: { resources: [], loading: true },
			global: { stubs }
		});
		expect(wrapper.find("[data-skeleton]").exists()).toBe(true);
		expect(wrapper.text()).not.toContain("No resources discovered");
	});

	it("shows its own empty state when no resources exist", () => {
		const wrapper = mount(ResourceExplorer, {
			props: { resources: [] },
			global: { stubs }
		});
		expect(wrapper.text()).toContain("No resources discovered");
	});
});
