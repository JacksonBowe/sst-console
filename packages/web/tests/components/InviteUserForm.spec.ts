import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import InviteUserForm from "@/components/Users/InviteUserForm.vue";

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock("@/composables/users", () => ({
	useInviteUser: () => ({ mutate, isPending: { value: false } })
}));

describe("InviteUserForm", () => {
	it("enables submission after editing and sends the email", async () => {
		const wrapper = mount(InviteUserForm, {
			global: {
				stubs: {
					QCard: { template: "<div><slot /></div>" },
					QCardSection: { template: "<div><slot /></div>" },
					QCardActions: { template: "<div><slot /></div>" },
					QForm: {
						template:
							"<form @submit.prevent=\"$emit('submit', $event)\"><slot /></form>"
					},
					QBtn: {
						props: ["disable", "type"],
						template:
							"<button :disabled='disable' :type='type'><slot /></button>"
					},
					SInput: {
						props: ["modelValue"],
						template:
							"<input :value='modelValue' @input=\"$emit('update:modelValue', $event.target.value)\" />"
					}
				},
				directives: { closePopup: {} }
			}
		});
		const submit = wrapper.get('button[type="submit"]');
		expect(submit.attributes("disabled")).toBeDefined();
		await wrapper.get("input").setValue("user@example.com");
		expect(submit.attributes("disabled")).toBeUndefined();
		await wrapper.get("form").trigger("submit");
		expect(mutate).toHaveBeenCalledWith(
			{ email: "user@example.com" },
			expect.objectContaining({ onSuccess: expect.any(Function) })
		);
	});
});
