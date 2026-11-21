import { mount } from "@vue/test-utils";
import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import UsersPage from "@/pages/UsersPage.vue";

vi.mock("@/composables/users", () => ({
	useUsers: () => ({
		data: ref({
			pages: [
				{
					items: [
						{
							id: "1",
							email: "person@example.com",
							cognitoStatus: "CONFIRMED",
							cognitoEnabled: true,
							createdAt: "2026-01-01"
						}
					]
				}
			]
		}),
		isPending: ref(false),
		isFetchingNextPage: ref(false),
		isError: ref(false)
	})
}));
vi.mock("@/components/ui/Dashboard", () => ({
	DashboardPage: { template: "<main><slot /></main>" },
	DashboardPageContent: { template: "<section><slot /></section>" },
	DashboardPageHeader: {
		template: "<header><slot name='actions' /></header>"
	}
}));
vi.mock("@/components/ui/Table", () => ({
	TableSearch: {
		props: ["modelValue"],
		template:
			"<div><button @click=\"$emit('update:modelValue', 'missing')\">Search</button><button @click=\"$emit('update:modelValue', null)\">Clear</button></div>"
	},
	TableFilter: { template: "<div />" },
	TableClearFilters: { template: "<div />" },
	BaseTable: {
		props: ["rows"],
		template:
			"<div data-rows>{{ rows.map(row => row.email).join(',') }}</div>"
	}
}));

describe("UsersPage search", () => {
	it("restores users when Quasar clears search to null", async () => {
		const wrapper = mount(UsersPage, {
			global: {
				mocks: { $q: { screen: { lt: { sm: false } } } },
				stubs: {
					DialogTrigger: true,
					QBtn: true,
					QBanner: true,
					QTd: true,
					QCard: true,
					QCardSection: true
				}
			}
		});
		expect(wrapper.get("[data-rows]").text()).toBe("person@example.com");
		await wrapper.get("button").trigger("click");
		expect(wrapper.get("[data-rows]").text()).toBe("");
		await wrapper.findAll("button")[1]!.trigger("click");
		expect(wrapper.get("[data-rows]").text()).toBe("person@example.com");
	});
});
