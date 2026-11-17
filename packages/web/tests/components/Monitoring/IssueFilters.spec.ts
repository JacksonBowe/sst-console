import { mount } from "@vue/test-utils";
import {
	QBtn,
	QBtnToggle,
	QIcon,
	QItem,
	QItemSection,
	QList,
	QSelect,
	QSeparator,
	Quasar
} from "quasar";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, ref, computed } from "vue";
import type { Issue } from "@sst-console/sdk";
import type { Filters } from "@/components/ui/Table";
import IssueFilters from "@/components/Monitoring/Issues/IssueFilters.vue";
import { filterIssues } from "@/components/Monitoring/Issues/issue-filters";

// Use Quasar's real browser build in the DOM test environment.
vi.mock("quasar", () => vi.importActual("quasar/dist/quasar.client.js"));

describe("issue status filters", () => {
	it("applies one status immediately in the sheet", async () => {
		const issues = [
			{ status: "open", appName: "app", stageName: "stage" },
			{ status: "resolved", appName: "app", stageName: "stage" }
		] as Issue[];
		const harness = defineComponent({
			components: { IssueFilters },
			setup() {
				const filters = ref<Filters>({
					text: "",
					facets: { status: ["open"] }
				});
				const visible = computed(() =>
					filterIssues(issues, filters.value)
				);
				return { issues, filters, visible };
			},
			template:
				'<IssueFilters :issues="issues" :filters="filters" @change="filters = $event" /><div data-visible>{{ visible.map(issue => issue.status).join(",") }}</div>'
		});
		const wrapper = mount(harness, {
			global: {
				plugins: [
					[
						Quasar,
						{
							components: {
								QBtn,
								QBtnToggle,
								QIcon,
								QItem,
								QItemSection,
								QList,
								QSelect,
								QSeparator
							}
						}
					]
				]
			}
		});
		const button = (label: string) =>
			wrapper.findAll("button").find(item => item.text() === label)!;
		expect(wrapper.get("[data-visible]").text()).toBe("open");
		await button("Resolved").trigger("click");
		expect(wrapper.get("[data-visible]").text()).toBe("resolved");
		await button("All").trigger("click");
		expect(wrapper.get("[data-visible]").text()).toBe("open,resolved");
		wrapper.unmount();
	});
});
