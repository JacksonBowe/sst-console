import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import DashboardPageHeader from "@/components/ui/Dashboard/DashboardPageHeader.vue";

vi.mock("quasar", () => ({
	useQuasar: () => ({ screen: { lt: { sm: false } } })
}));
vi.mock("vue-router", () => ({ useRouter: () => ({ back: vi.fn() }) }));

describe("DashboardPageHeader", () => {
	it("styles a subtitle prop with muted text", () => {
		const wrapper = mount(DashboardPageHeader, {
			props: { subtitle: "Description" }
		});
		expect(wrapper.find(".text-muted").text()).toBe("Description");
	});

	it("leaves subtitle slot styling to its caller", () => {
		const wrapper = mount(DashboardPageHeader, {
			slots: { subtitle: '<span class="custom">Custom</span>' }
		});
		expect(wrapper.find(".custom").exists()).toBe(true);
		expect(wrapper.find(".text-muted").exists()).toBe(false);
	});
});
