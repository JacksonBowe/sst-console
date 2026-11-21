import { mount } from "@vue/test-utils";
import { reactive } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ConsoleLayout from "@/layouts/ConsoleLayout.vue";
import routes from "@/router/routes";

const state = vi.hoisted(() => ({
	settings: { contentWidth: "centered" },
	route: { meta: { fullWidth: false } }
}));

vi.mock("quasar", () => ({
	useQuasar: () => ({ screen: { lt: { md: false } } })
}));
vi.mock("vue-router", () => ({ useRoute: () => state.route }));
vi.mock("@/stores/ui-settings", () => ({
	useUISettingsStore: () => state.settings
}));
vi.mock("@/stores/local-session", () => ({
	useLocalSessionStore: () => ({ initialize: vi.fn(), stop: vi.fn() })
}));
vi.mock("@/components/Console", () => ({
	ConsoleHeader: { template: "<header><slot /></header>" },
	ConsoleSidebar: { template: "<aside />" }
}));

describe("ConsoleLayout", () => {
	beforeEach(() => {
		state.settings = reactive({ contentWidth: "centered" });
		state.route = reactive({ meta: { fullWidth: false } });
	});

	it("constrains pages only when enabled and not excluded", async () => {
		const wrapper = mount(ConsoleLayout, {
			global: {
				stubs: {
					QLayout: { template: "<div><slot /></div>" },
					QPageContainer: { template: "<div><slot /></div>" },
					RouterView: { template: "<main />" }
				}
			}
		});
		expect(
			wrapper.find(".console-layout__content--centered").exists()
		).toBe(true);

		state.route.meta.fullWidth = true;
		await wrapper.vm.$nextTick();
		expect(
			wrapper.find(".console-layout__content--centered").exists()
		).toBe(false);

		state.route.meta.fullWidth = false;
		state.settings.contentWidth = "full";
		await wrapper.vm.$nextTick();
		expect(
			wrapper.find(".console-layout__content--centered").exists()
		).toBe(false);
	});

	it("excludes both Local Workspace routes", () => {
		const children = routes[0]?.children ?? [];
		for (const name of ["local-workspace", "stage-local-workspace"]) {
			expect(
				children.find(route => route.name === name)?.meta?.fullWidth
			).toBe(true);
		}
	});
});
