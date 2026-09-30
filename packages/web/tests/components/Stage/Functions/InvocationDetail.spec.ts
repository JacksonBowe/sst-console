import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import InvocationDetail from "@/components/App/Detail/Stage/Functions/LocalWorkspace/InvocationDetail.vue";
import InvocationErrorPanel from "@/components/App/Detail/Stage/Functions/LocalWorkspace/InvocationErrorPanel.vue";
import InvocationLogPanel from "@/components/App/Detail/Stage/Functions/LocalWorkspace/InvocationLogPanel.vue";
import InvocationListRow from "@/components/App/Detail/Stage/Functions/LocalWorkspace/InvocationListRow.vue";
import InvocationPayloadPanel from "@/components/App/Detail/Stage/Functions/LocalWorkspace/InvocationPayloadPanel.vue";
import type { LocalInvocation } from "@/composables/local";

const clipboardWrite = vi.fn();
const stubs = {
	CodePreview: {
		props: { code: String },
		template: "<pre>{{ code }}</pre>"
	},
	QCard: { template: "<div><slot /></div>" },
	QCardSection: { template: "<div><slot /></div>" },
	QBadge: { template: "<span><slot /></span>" },
	QBtn: {
		emits: ["click"],
		inheritAttrs: false,
		template:
			'<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>'
	},
	QIcon: true,
	QScrollArea: { template: "<div><slot /></div>" },
	QSpace: true,
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

	it("renders JSON Lambda response bodies as structured output", async () => {
		const wrapper = mount(InvocationDetail, {
			props: {
				invocation: {
					...invocation,
					output: {
						response: { body: '{"accepted":true}' }
					}
				}
			},
			global: { stubs }
		});

		await wrapper.get('[data-tab="output"]').trigger("click");
		expect(wrapper.text()).toContain('"body": {');
		expect(wrapper.text()).toContain('"accepted": true');
	});

	it("keeps handled HTTP errors on overview", async () => {
		const wrapper = mount(InvocationDetail, {
			props: {
				invocation: {
					...invocation,
					status: "application_error",
					output: {
						statusCode: 500,
						body: '{"code":"internal_error"}'
					}
				}
			},
			global: { stubs }
		});

		expect(wrapper.text()).toContain("Error");
		expect(wrapper.text()).not.toContain("HTTP 500 response");
		await wrapper.get('[data-tab="errors"]').trigger("click");
		expect(wrapper.text()).toContain("HTTP 500 response");
		expect(wrapper.text()).toContain('"code": "internal_error"');
	});

	it("opens platform errors on the error tab", () => {
		const wrapper = mount(InvocationDetail, {
			props: {
				invocation: {
					...invocation,
					status: "platform_error",
					errors: [
						{
							error: "Error",
							message: "Function crashed",
							stack: ["at handler"]
						}
					]
				}
			},
			global: { stubs }
		});

		expect(wrapper.text()).toContain("Function crashed");
	});

	it("redacts secrets in JSON request bodies", async () => {
		const wrapper = mount(InvocationDetail, {
			props: {
				invocation: {
					...invocation,
					input: {
						body: '{"refreshToken":"abcd1234efgh5678"}'
					}
				}
			},
			global: { stubs }
		});

		await wrapper.get('[data-tab="input"]').trigger("click");
		expect(wrapper.text()).toContain('"refreshToken": "abcd…5678"');
		expect(wrapper.text()).not.toContain("abcd1234efgh5678");
	});
});

describe("InvocationPayloadPanel", () => {
	beforeEach(() => {
		clipboardWrite.mockReset();
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: { writeText: clipboardWrite }
		});
	});

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

	it("redacts input secrets until revealed", async () => {
		const wrapper = mount(InvocationPayloadPanel, {
			props: {
				label: "Input",
				value: {
					authorization: "Bearer 1234567890abcdef",
					apiKey: "abcd1234efgh5678",
					aws_secret_access_key: "wxyz1234efgh5678"
				},
				emptyMessage: "Missing",
				redact: true
			},
			global: { stubs }
		});

		expect(wrapper.text()).toContain("Bearer 1234…cdef");
		expect(wrapper.text()).toContain("abcd…5678");
		expect(wrapper.text()).toContain("wxyz…5678");
		expect(wrapper.text()).not.toContain("1234567890abcdef");
		await wrapper.get('[aria-label="Copy input"]').trigger("click");
		expect(clipboardWrite).toHaveBeenLastCalledWith(
			expect.stringContaining("Bearer 1234…cdef")
		);

		await wrapper.get('[aria-label="Reveal input"]').trigger("click");
		expect(wrapper.text()).toContain("Bearer 1234567890abcdef");
		await wrapper.get('[aria-label="Copy input"]').trigger("click");
		expect(clipboardWrite).toHaveBeenLastCalledWith(
			expect.stringContaining("Bearer 1234567890abcdef")
		);
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

describe("InvocationListRow", () => {
	it("shows application error status indicator", () => {
		const wrapper = mount(InvocationListRow, {
			props: {
				invocation: { ...invocation, status: "application_error" },
				active: false
			}
		});

		expect(wrapper.text()).toContain("Error");
		expect(
			wrapper.get(".invocation-list-row__status-dot").classes()
		).toContain("bg-warning");
	});

	it("navigates with keyboard while keeping one tab stop", async () => {
		const wrapper = mount(InvocationListRow, {
			props: { invocation, active: true }
		});

		expect(wrapper.get('[role="option"]').attributes("tabindex")).toBe("0");
		await wrapper
			.get('[role="option"]')
			.trigger("keydown", { key: "ArrowDown" });
		expect(wrapper.emitted("navigate")).toEqual([["next"]]);
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
		expect(wrapper.findAll('[aria-label="Copy errors"]')).toHaveLength(1);
		await wrapper.get('[aria-label="Copy errors"]').trigger("click");
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
