import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import UserActions from "@/components/Users/UserActions.vue";

const { setEnabled } = vi.hoisted(() => ({ setEnabled: vi.fn() }));
vi.mock("@/composables/users", () => ({
	useRemoveUser: () => ({ mutateAsync: vi.fn() }),
	useInviteUser: () => ({ mutate: vi.fn() }),
	useSetUserEnabled: () => ({ mutate: setEnabled })
}));

describe("UserActions", () => {
	it("offers retry disable for a disabled user", async () => {
		const wrapper = mount(UserActions, {
			props: {
				user: {
					id: "user-id",
					email: "user@example.com",
					cognitoStatus: "CONFIRMED",
					cognitoEnabled: false,
					createdAt: "2026-01-01",
					updatedAt: "2026-01-01"
				}
			},
			global: {
				stubs: {
					QBtn: { template: "<div><slot /></div>" },
					QMenu: { template: "<div><slot /></div>" },
					QList: { template: "<div><slot /></div>" },
					QItem: { template: "<button><slot /></button>" },
					QItemSection: { template: "<span><slot /></span>" }
				},
				directives: { closePopup: {} }
			}
		});
		const retry = wrapper
			.findAll("button")
			.find(button => button.text() === "Retry disable");
		expect(retry).toBeDefined();
		await retry!.trigger("click");
		expect(setEnabled).toHaveBeenCalledWith({
			id: "user-id",
			enabled: false
		});
	});
});
