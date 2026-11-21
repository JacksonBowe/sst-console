import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import UserActions from "@/components/Users/UserActions.vue";

const { setEnabled } = vi.hoisted(() => ({ setEnabled: vi.fn() }));
vi.mock("@/composables/users", () => ({
	useRemoveUser: () => ({ mutateAsync: vi.fn() }),
	useInviteUser: () => ({ mutate: vi.fn() }),
	useSetUserEnabled: () => ({ mutate: setEnabled })
}));
vi.mock("@/components/ui/toast", () => ({ successNotify: vi.fn() }));

describe("UserActions", () => {
	it("does not offer retry after a successful disable", async () => {
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
		expect(retry).toBeUndefined();
	});

	it("keeps the normal disable action available", async () => {
		const user = {
			id: "user-id",
			email: "user@example.com",
			cognitoStatus: "CONFIRMED" as const,
			cognitoEnabled: true,
			createdAt: "2026-01-01",
			updatedAt: "2026-01-01"
		};
		const wrapper = mount(UserActions, {
			props: { user },
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
		await wrapper
			.findAll("button")
			.find(button => button.text() === "Disable")!
			.trigger("click");
		expect(setEnabled).toHaveBeenLastCalledWith(
			{ id: user.id, enabled: false },
			expect.objectContaining({ onSuccess: expect.any(Function) })
		);
		expect(
			wrapper
				.findAll("button")
				.find(button => button.text() === "Retry disable")
		).toBeUndefined();
		expect(
			wrapper
				.findAll("button")
				.find(button => button.text() === "Disable")
		).toBeDefined();
	});
});
