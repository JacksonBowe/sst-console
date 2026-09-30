import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import InvocationDetail from "@/components/App/Detail/Stage/Functions/LocalWorkspace/InvocationDetail.vue";
import InvocationErrorPanel from "@/components/App/Detail/Stage/Functions/LocalWorkspace/InvocationErrorPanel.vue";
import InvocationLogPanel from "@/components/App/Detail/Stage/Functions/LocalWorkspace/InvocationLogPanel.vue";
import InvocationPayloadPanel from "@/components/App/Detail/Stage/Functions/LocalWorkspace/InvocationPayloadPanel.vue";
import type { LocalInvocation } from "@/composables/local";

const clipboardWrite = vi.fn();
const stubs = {
	QCard: { template: "<div><slot /></div>" },
	QCardSection: { template: "<div><slot /></div>" },
	QBadge: { template: "<span><slot /></span>" },
	QBtn: {
		inheritAttrs: false,
		template:
			'<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>'
	},
	QIcon: true,
	QScrollArea: { template: "<div><slot /></div>" },
	QSeparator: true,
	QTabs: {
		emits: ["update:modelValue"],
		template: "<div><slot /></div>"
	},
	QTab: {
		props: { label: String, name: String },
		template:
			'<button type="button" :data-tab="name" @click="$parent.$emit(\'update:modelValue\', name)">{{ label }}</button>'
	}
};

const invocation: LocalInvocation = {
	id: "inv-1",
	source: "sst::Function::checkout",
	input: { orderId: "order-1" },
	output: { accepted: true },
	start: 1_700_000_000_000,
	end: 1_700_000_000_120,
	duration: 120,
	status: "success",
	logs: [
		{ id: "second", timestamp: 20, message: "second log" },
		{ id: "first", timestamp: 10, message: "first log" }
	],
	errors: []
};

describe("InvocationDetail", () => {
	beforeEach(() => {
		clipboardWrite.mockReset();
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: { writeText: clipboardWrite }
		});
	});

	it("shows guidance when no invocation is selected", () => {
		const wrapper = mount(InvocationDetail, { global: { stubs } });

		expect(wrapper.text()).toContain("Select an invocation");
	});

	it("composes summary and exposes payload and log panels through tabs", async () => {
		const wrapper = mount(InvocationDetail, {
			props: { invocation },
			global: { stubs }
		});

		expect(wrapper.text()).toContain("checkout");
		expect(wrapper.text()).toContain("Success");
		expect(wrapper.text()).toContain('"orderId": "order-1"');
		expect(wrapper.text()).toContain('"accepted": true');
		expect(wrapper.text()).toContain("first log");
		await wrapper.get('[data-tab="input"]').trigger("click");
		expect(wrapper.text()).toContain('"orderId": "order-1"');
		await wrapper.get('[data-tab="output"]').trigger("click");
		expect(wrapper.text()).toContain('"accepted": true');
		await wrapper.get('[data-tab="logs"]').trigger("click");
		const logs = wrapper.text();
		expect(logs.indexOf("first log")).toBeLessThan(
			logs.indexOf("second log")
		);
	});

	it("shows truthful missing payload and log states", async () => {
		const wrapper = mount(InvocationDetail, {
			props: {
				invocation: {
					...invocation,
					input: undefined,
					output: undefined,
					logs: []
				}
			},
			global: { stubs }
		});

		await wrapper.get('[data-tab="input"]').trigger("click");
		expect(wrapper.text()).toContain("No input captured.");
		await wrapper.get('[data-tab="output"]').trigger("click");
		expect(wrapper.text()).toContain("No output captured.");
		await wrapper.get('[data-tab="logs"]').trigger("click");
		expect(wrapper.text()).toContain("No log lines yet.");
	});
});

describe("InvocationPayloadPanel", () => {
	it("renders a JSON card header", () => {
		const wrapper = mount(InvocationPayloadPanel, {
			props: {
				label: "Input",
				value: { id: "input-1" },
				emptyMessage: "Missing"
			},
			global: { stubs }
		});

		expect(wrapper.get("h3").text()).toBe("Input");
		expect(wrapper.text()).toContain("JSON");
	});

	it("copies received structured data", async () => {
		const wrapper = mount(InvocationPayloadPanel, {
			props: {
				label: "Input",
				value: { id: "input-1" },
				emptyMessage: "Missing"
			},
			global: { stubs }
		});

		await wrapper.get('[aria-label="Copy input"]').trigger("click");

		expect(clipboardWrite).toHaveBeenCalledWith('{\n  "id": "input-1"\n}');
	});
});

describe("InvocationLogPanel", () => {
	it("keeps log whitespace", () => {
		const wrapper = mount(InvocationLogPanel, {
			props: {
				logs: [
					{ id: "log-1", timestamp: 0, message: "first\n  second" }
				]
			},
			global: { stubs }
		});

		expect(wrapper.get("pre").text()).toBe("first\n  second");
	});
});

describe("InvocationErrorPanel", () => {
	it("renders and copies received error fields only", async () => {
		const wrapper = mount(InvocationErrorPanel, {
			props: {
				errors: [
					{
						error: "TypeError",
						message: "Bad input",
						stack: ["at checkout"]
					},
					{ stack: [] }
				]
			},
			global: { stubs }
		});

		expect(wrapper.text()).toContain("TypeError");
		expect(wrapper.text()).toContain("Bad input");
		expect(wrapper.text()).toContain("at checkout");
		expect(wrapper.findAll('[aria-label^="Copy error"]')).toHaveLength(1);
		await wrapper.get('[aria-label="Copy error 1"]').trigger("click");
		expect(clipboardWrite).toHaveBeenCalledWith(
			"TypeError\nBad input\nat checkout"
		);
	});

	it("does not render empty received errors", () => {
		const wrapper = mount(InvocationErrorPanel, {
			props: { errors: [{ stack: [] }] },
			global: { stubs }
		});

		expect(wrapper.find("section").exists()).toBe(false);
	});
});
