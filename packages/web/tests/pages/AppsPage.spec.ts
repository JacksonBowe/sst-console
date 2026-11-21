import { mount } from "@vue/test-utils";
import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";

import AppsPage from "@/pages/AppsPage.vue";

vi.mock("@/composables/apps", () => ({
	useApps: () => ({
		data: ref([
			{ appName: "alpha", stages: [{ accountId: "111" }] },
			{ appName: "beta", stages: [{ accountId: "222" }] }
		]),
		isPending: ref(false),
		isError: ref(false)
	})
}));
vi.mock("@/composables/issues", () => ({
	useIssues: () => ({ data: ref([]) })
}));
vi.mock("@/components/Accounts", () => ({
	ConnectAccountTrigger: { template: "<div />" }
}));
vi.mock("@/components/App", () => ({
	AppsList: {
		props: ["apps"],
		template:
			'<div data-apps>{{ apps.map(app => app.appName).join(",") }}</div>'
	},
	AppsListErrorState: { template: "<div />" },
	AppsListNotFoundState: { template: "<div />" }
}));
vi.mock("@/components/ui/Dashboard", () => ({
	DashboardPage: { template: "<main><slot /></main>" },
	DashboardPageContent: { template: "<section><slot /></section>" },
	DashboardPageHeader: {
		template: '<header><slot name="actions" /></header>'
	}
}));
vi.mock("@/components/ui/Table", () => ({
	TableSearch: {
		props: ["modelValue"],
		template:
			'<input aria-label="Search" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
	},
	TableFilter: {
		props: ["modelValue", "label", "options"],
		template:
			"<button :aria-label=\"label\" @click=\"$emit('update:modelValue', ['111'])\">Account</button>"
	}
}));

describe("AppsPage toolbar", () => {
	it.each([true, false])(
		"keeps search and account filter together at mobile=%s",
		async mobile => {
			const wrapper = mount(AppsPage, {
				global: { mocks: { $q: { screen: { lt: { sm: mobile } } } } }
			});
			const search = wrapper.get('[aria-label="Search"]');
			const filter = wrapper.get('[aria-label="Account"]');
			expect(search.element.parentElement?.parentElement).toBe(
				filter.element.parentElement
			);
			expect(wrapper.find(".row.no-wrap").exists()).toBe(true);
			expect(
				search.element.parentElement?.classList.contains("col")
			).toBe(mobile);

			await filter.trigger("click");
			expect(wrapper.get("[data-apps]").text()).toBe("alpha");
			await search.setValue("beta");
			expect(wrapper.get("[data-apps]").text()).toBe("");
			await search.setValue("alpha");
			expect(wrapper.get("[data-apps]").text()).toBe("alpha");
		}
	);
});
