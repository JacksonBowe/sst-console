import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import TableFilter from "@/components/ui/Table/TableFilter.vue";

describe("TableFilter", () => {
	it("sizes its menu from the longest option label", () => {
		const functionName = "SSTConsoleCognitoUserPoolTriggercustomMessage";
		const wrapper = mount(TableFilter, {
			props: {
				label: "Function",
				options: [
					{ label: "Short", value: "short" },
					{ label: functionName, value: functionName }
				],
				modelValue: []
			},
			global: {
				stubs: {
					QBtn: { template: "<button><slot /></button>" },
					QMenu: { template: "<div><slot /></div>" },
					QScrollArea: { template: "<div><slot /></div>" },
					QList: { template: "<div><slot /></div>" },
					QItem: { template: "<div><slot /></div>" },
					QItemSection: { template: "<div><slot /></div>" }
				}
			}
		});

		expect(
			wrapper.get(".table-filter__panel").attributes("style")
		).toContain(`width: ${functionName.length * 8 + 65}px`);
		expect(
			wrapper
				.findAll(".table-filter__option-label")[1]
				?.attributes("title")
		).toBe(functionName);
	});
});
