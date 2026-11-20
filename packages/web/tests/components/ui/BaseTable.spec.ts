import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import BaseTable from "@/components/ui/Table/BaseTable.vue";

describe("BaseTable", () => {
	it("forwards grid items to the custom slot", () => {
		const wrapper = mount(BaseTable, {
			props: { rows: [{ id: "one" }], columns: [] },
			attrs: { grid: true },
			slots: {
				item: '<template #item="{ row }"><span>{{ row.id }}</span></template>'
			},
			global: {
				stubs: {
					QInnerLoading: true,
					QIcon: true,
					QTd: true,
					QTh: true,
					QTr: true,
					QTable: {
						props: ["grid", "rows"],
						template:
							'<div :data-grid="grid"><slot name="item" :row="rows[0]" /></div>'
					}
				}
			}
		});
		expect(wrapper.attributes("data-grid")).toBe("true");
		expect(wrapper.text()).toBe("one");
	});

	it("passes show-all pagination and hidden controls to QTable", () => {
		const wrapper = mount(BaseTable, {
			props: {
				rows: Array.from({ length: 25 }, (_, id) => ({ id })),
				columns: [{ name: "id", label: "ID", field: "id" }],
				rowKey: "id",
				rowsPerPageOptions: [0]
			},
			attrs: { hidePagination: true },
			global: {
				stubs: {
					QInnerLoading: true,
					QIcon: true,
					QTd: true,
					QTh: true,
					QTr: true,
					QTable: {
						props: ["pagination", "hidePagination"],
						template:
							'<div :data-rows-per-page="pagination.rowsPerPage" :data-hidden="hidePagination" />'
					}
				}
			}
		});
		expect(wrapper.attributes("data-rows-per-page")).toBe("0");
		expect(wrapper.attributes("data-hidden")).toBe("true");
	});
});
