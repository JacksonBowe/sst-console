import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import AccountDetailActions from "@/components/Accounts/AccountDetailActions.vue";

describe("AccountDetailActions", () => {
	it.each([true, false])(
		"keeps accessible actions and behavior at mobile=%s",
		async mobile => {
			const wrapper = mount(AccountDetailActions, {
				props: { refreshing: false, applying: false, canApply: true },
				global: {
					mocks: { $q: { screen: { lt: { sm: mobile } } } },
					stubs: { QBtn: true }
				}
			});
			const refresh = wrapper.get('[aria-label="Refresh discovery"]');
			const apply = wrapper.get('[aria-label="Apply and sync"]');
			expect(refresh.attributes("label")).toBe(
				mobile ? undefined : "Refresh discovery"
			);
			expect(apply.attributes("label")).toBe(
				mobile ? undefined : "Apply and sync"
			);
			await refresh.trigger("click");
			await apply.trigger("click");
			expect(wrapper.emitted("refresh")).toHaveLength(1);
			expect(wrapper.emitted("apply")).toHaveLength(1);
		}
	);

	it("disables apply when no policy is available", () => {
		const wrapper = mount(AccountDetailActions, {
			props: { refreshing: false, applying: false, canApply: false },
			global: {
				mocks: { $q: { screen: { lt: { sm: true } } } },
				stubs: { QBtn: true }
			}
		});
		expect(
			wrapper.get('[aria-label="Apply and sync"]').attributes("disable")
		).toBe("true");
	});
});
