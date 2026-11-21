import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import ConnectAccountTrigger from "@/components/Accounts/ConnectAccountTrigger.vue";

describe("ConnectAccountTrigger", () => {
	it.each([true, false])(
		"keeps its dialog action at iconOnly=%s",
		async iconOnly => {
			const open = vi.fn();
			const wrapper = mount(ConnectAccountTrigger, {
				props: { iconOnly },
				global: {
					stubs: {
						DialogTrigger: {
							setup: () => ({ open }),
							template:
								'<div><slot name="trigger" :open="open" /></div>'
						},
						QBtn: true
					}
				}
			});
			const button = wrapper.get('[aria-label="Connect account"]');
			expect(button.attributes("label")).toBe(
				iconOnly ? undefined : "Connect account"
			);
			expect(button.attributes("icon")).toBe("sym_r_add");
			await button.trigger("click");
			expect(open).toHaveBeenCalledOnce();
		}
	);
});
