import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import CognitoAuth from "@/components/Auth/CognitoAuth.vue";

describe("CognitoAuth", () => {
	it("forwards card presentation options from its parent", () => {
		const wrapper = mount(CognitoAuth, {
			props: {
				passwordPolicy: {
					minimumLength: 8,
					passwordHistorySize: 0,
					requireLowercase: true,
					requireNumbers: true,
					requireSymbols: true,
					requireUppercase: true,
					temporaryPasswordValidityDays: 7
				}
			},
			attrs: { flat: true, class: "bg-transparent" },
			global: {
				stubs: {
					QCard: {
						props: ["flat"],
						template: '<div :data-flat="flat"><slot /></div>'
					},
					QCardSection: { template: "<div><slot /></div>" },
					CognitoSignInForm: true
				}
			}
		});
		expect(wrapper.attributes("data-flat")).toBe("true");
		expect(wrapper.classes()).toContain("bg-transparent");
		expect(wrapper.text()).toContain("Sign in");
	});
});
