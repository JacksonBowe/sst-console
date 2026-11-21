import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent } from "vue";
import BaseTable from "@/components/ui/Table/BaseTable.vue";

describe("BaseTable", () => {
	it("passes row classes to Quasar's table row class function", () => {
		const rowClass = () => "text-muted";
		const table = defineComponent({
			props: ["tableRowClassFn"],
			template: "<div />"
		});
		const wrapper = mount(BaseTable, {
			props: { rows: [], columns: [], rowClass },
			global: {
				stubs: {
					QTable: table,
					QInnerLoading: true,
					QIcon: true,
					QTd: true,
					QTh: true,
					QTr: true
				}
			}
		});
		expect(wrapper.getComponent(table).props("tableRowClassFn")).toBe(
			rowClass
		);
	});
});
