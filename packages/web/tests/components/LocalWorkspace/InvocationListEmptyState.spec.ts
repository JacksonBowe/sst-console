import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import InvocationListEmptyState from "@/components/LocalWorkspace/InvocationListEmptyState.vue";

describe("InvocationListEmptyState", () => {
	it.each([
		["disconnected", true, "Start SST dev"],
		["connecting", true, "Invocation activity appears after connection"],
		["connected", true, "Invoke a local function"],
		["connected", false, "Resume streaming"],
		["disconnected", false, "Start SST dev"]
	] as const)(
		"provides guidance for %s and streaming %s",
		(status, isStreaming, guidance) => {
			const wrapper = mount(InvocationListEmptyState, {
				props: { status, isStreaming },
				global: { stubs: { QIcon: true } }
			});
			expect(wrapper.text()).toContain(guidance);
		}
	);

	it("suggests clearing filters when invocations do not match", () => {
		const wrapper = mount(InvocationListEmptyState, {
			props: { status: "connected", isStreaming: true, filtered: true },
			global: { stubs: { QIcon: true } }
		});
		expect(wrapper.text()).toContain("Change or clear filters");
	});
});
