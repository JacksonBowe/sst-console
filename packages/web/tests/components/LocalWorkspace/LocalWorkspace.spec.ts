import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import LocalWorkspace from "@/components/LocalWorkspace/LocalWorkspace.vue";
import LocalActivityToolbar from "@/components/LocalWorkspace/LocalActivityToolbar.vue";
import type { LocalInvocation } from "@/composables/local";
import { filterInvocations } from "@/components/LocalWorkspace/invocation-filters";

const latest: LocalInvocation = {
	id: "latest",
	start: 2,
	status: "success",
	logs: [],
	errors: []
};
const older: LocalInvocation = {
	id: "older",
	start: 1,
	status: "success",
	logs: [],
	errors: []
};

const stubs = {
	LocalActivityToolbar: {
		emits: ["clear"],
		template: "<button data-clear @click=\"$emit('clear')\" />"
	},
	InvocationList: {
		props: { invocations: Array, status: String, selectedId: String },
		emits: ["select"],
		template:
			"<button data-select-older @click=\"$emit('select', 'older')\" />"
	},
	InvocationDetail: {
		name: "InvocationDetail",
		props: { invocation: Object },
		template: "<div />"
	}
};

describe("LocalWorkspace", () => {
	it("emits clear from activity toolbar", async () => {
		const wrapper = mount(LocalActivityToolbar, {
			props: { text: "", statuses: [] },
			global: {
				stubs: {
					TableFilter: true,
					TableSearch: true,
					QSpace: true,
					QBtn: {
						emits: ["click"],
						template:
							"<button @click=\"$emit('click')\"><slot /></button>"
					}
				}
			}
		});

		await wrapper.findAll("button")[1]!.trigger("click");
		expect(wrapper.emitted("clear")).toHaveLength(1);
	});

	it("preserves selected invocation through incoming activity", async () => {
		const wrapper = mount(LocalWorkspace, {
			props: { invocations: [latest, older], status: "connected" },
			global: { stubs }
		});

		await wrapper.get("[data-select-older]").trigger("click");
		await wrapper.setProps({
			invocations: [{ ...latest, id: "newest" }, latest, older]
		} as never);
		expect(
			wrapper.findComponent(stubs.InvocationDetail).props("invocation")
		).toMatchObject({
			id: "older"
		});
	});

	it("clears activity through the workspace toolbar", async () => {
		const wrapper = mount(LocalWorkspace, {
			props: { invocations: [latest], status: "connected" },
			global: {
				stubs: {
					...stubs,
					LocalActivityToolbar: {
						emits: ["clear"],
						template:
							"<button data-clear @click=\"$emit('clear')\" />"
					}
				}
			}
		});

		await wrapper.get("[data-clear]").trigger("click");
		expect(wrapper.emitted("clear")).toHaveLength(1);
	});

	it("clears selection when filters hide every invocation", async () => {
		const wrapper = mount(LocalWorkspace, {
			props: { invocations: [latest], status: "connected" },
			global: {
				stubs: {
					...stubs,
					LocalActivityToolbar: {
						emits: ["update:text"],
						template:
							"<button data-filter @click=\"$emit('update:text', 'missing')\" />"
					}
				}
			}
		});

		await wrapper.get("[data-filter]").trigger("click");
		expect(
			wrapper.findComponent(stubs.InvocationDetail).props("invocation")
		).toBeUndefined();
	});
});

describe("local invocation filters", () => {
	it("matches function name and HTTP route only", () => {
		const invocations: LocalInvocation[] = [
			{
				...latest,
				source: "sst::Function::checkout",
				http: { method: "POST", path: "/orders" }
			}
		];

		expect(
			filterInvocations(invocations, { text: "checkout", facets: {} })
		).toHaveLength(1);
		expect(
			filterInvocations(invocations, { text: "post /orders", facets: {} })
		).toHaveLength(1);
		expect(
			filterInvocations(invocations, { text: "success", facets: {} })
		).toHaveLength(0);
	});

	it("groups application and platform failures under Error", () => {
		const invocations: LocalInvocation[] = [
			{ ...latest, id: "application", status: "application_error" },
			{ ...latest, id: "platform", status: "platform_error" },
			{ ...latest, id: "success", status: "success" }
		];

		expect(
			filterInvocations(invocations, {
				text: "",
				facets: { status: ["error"] }
			}).map(invocation => invocation.id)
		).toEqual(["application", "platform"]);
	});
});
