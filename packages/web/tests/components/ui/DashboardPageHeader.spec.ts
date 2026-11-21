import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import DashboardPageHeader from "@/components/ui/Dashboard/DashboardPageHeader.vue";

vi.mock("quasar", () => ({
	useQuasar: () => ({ screen: { lt: { sm: true } } })
}));

vi.mock("vue-router", () => ({
	useRouter: () => ({ back: vi.fn() })
}));

describe("DashboardPageHeader", () => {
	it("keeps the heading and actions in a non-wrapping row", () => {
		const wrapper = mount(DashboardPageHeader, {
			props: {
				title: "Monitoring",
				subtitle:
					"Investigate workload failures and configure notifications"
			},
			slots: {
				actions: '<button aria-label="More actions">More</button>'
			},
			global: { stubs: { QBtn: true, QIcon: true } }
		});

		expect(wrapper.classes()).toContain("no-wrap");
		expect(wrapper.classes()).toContain("items-start");
		expect(wrapper.find(".col").text()).toContain(
			"Investigate workload failures"
		);
		expect(
			wrapper.find(".col-shrink button").attributes("aria-label")
		).toBe("More actions");
	});

	it("preserves the custom default slot layout", () => {
		const wrapper = mount(DashboardPageHeader, {
			slots: { default: "<div data-custom-header>Custom header</div>" },
			global: { stubs: { QBtn: true, QIcon: true } }
		});

		expect(wrapper.classes()).toContain("items-center");
		expect(wrapper.classes()).not.toContain("no-wrap");
		expect(wrapper.find("[data-custom-header]").exists()).toBe(true);
	});
});
