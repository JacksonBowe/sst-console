import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

import CodePreview from "@/components/ui/CodePreview/CodePreview.vue";
import { highlightCode } from "@/components/ui/CodePreview/highlight";

vi.mock("@/components/ui/CodePreview/highlight", () => ({
	highlightCode: vi.fn()
}));

const stubs = {
	QScrollArea: { template: "<div><slot /></div>" }
};

describe("CodePreview", () => {
	it("escapes plain text", () => {
		const wrapper = mount(CodePreview, {
			props: { code: '<script>alert("unsafe")</script>' },
			global: { stubs }
		});

		expect(wrapper.html()).toContain("&lt;script&gt;");
		expect(wrapper.find("script").exists()).toBe(false);
	});

	it("uses Shiki for the supplied language", async () => {
		vi.mocked(highlightCode).mockResolvedValue(
			'<pre class="shiki"><code><span>"value"</span></code></pre>'
		);
		const wrapper = mount(CodePreview, {
			props: { code: '{\n  "key": "value"\n}', language: "json" },
			global: { stubs }
		});

		await nextTick();
		await nextTick();

		expect(highlightCode).toHaveBeenCalledWith(
			'{\n  "key": "value"\n}',
			"json",
			expect.any(Boolean)
		);
		expect(wrapper.text()).toContain('"value"');
	});

	it("grows to content when using content mode", () => {
		const wrapper = mount(CodePreview, {
			props: {
				code: "Error: failed",
				mode: "content"
			},
			global: { stubs }
		});

		expect(wrapper.find(".code-preview--content").exists()).toBe(true);
		expect(wrapper.attributes("style")).toContain("max-height: 20rem");
	});
});
