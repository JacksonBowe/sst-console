import { mount, flushPromises } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin, useQuery } from "@tanstack/vue-query";
import { defineComponent } from "vue";
import { describe, expect, it, vi } from "vitest";
import UserActions from "@/components/Users/UserActions.vue";

const { setUserEnabled, successNotify } = vi.hoisted(() => ({
	setUserEnabled: vi.fn(),
	successNotify: vi.fn()
}));
vi.mock("@/boot/api-client", () => ({
	api: { setUserEnabled },
	handleApiError: vi.fn()
}));
vi.mock("@/components/ui/toast", () => ({ successNotify }));

describe("user access change", () => {
	it("shows success even if the row unmounts before the request completes", async () => {
		let resolve!: () => void;
		setUserEnabled.mockReset();
		successNotify.mockReset();
		setUserEnabled.mockReturnValue(
			new Promise<void>(done => {
				resolve = done;
			})
		);
		const queryClient = new QueryClient();
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
				plugins: [[VueQueryPlugin, { queryClient }]],
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
			.find(button => button.text() === "Enable")!
			.trigger("click");
		await flushPromises();
		wrapper.unmount();
		resolve();
		await flushPromises();
		expect(successNotify).toHaveBeenCalledWith("User enabled");
		queryClient.clear();
	});

	it.each([true, false])(
		"shows success and updates the user to enabled=%s despite a stale list refetch",
		async enabled => {
			setUserEnabled.mockReset();
			successNotify.mockReset();
			const user = {
				id: "user-id",
				email: "user@example.com",
				cognitoStatus: "CONFIRMED" as const,
				cognitoEnabled: !enabled,
				createdAt: "2026-01-01",
				updatedAt: "2026-01-01"
			};
			const page = {
				pages: [
					{
						items: [user],
						meta: { limit: 100, hasMore: false, nextCursor: null }
					}
				],
				pageParams: [undefined]
			};
			const queryClient = new QueryClient({
				defaultOptions: { queries: { retry: false } }
			});
			queryClient.setQueryData(["users"], page);
			setUserEnabled.mockResolvedValue(undefined);
			const host = defineComponent({
				components: { UserActions },
				setup() {
					return {
						query: useQuery({
							queryKey: ["users"],
							queryFn: () => page,
							staleTime: Infinity
						})
					};
				},
				template: `<div><span data-enabled>{{ query.data.value.pages[0].items[0].cognitoEnabled }}</span><UserActions :user="query.data.value.pages[0].items[0]" /></div>`
			});
			const wrapper = mount(host, {
				global: {
					plugins: [[VueQueryPlugin, { queryClient }]],
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
				.find(
					button => button.text() === (enabled ? "Enable" : "Disable")
				)!
				.trigger("click");
			await flushPromises();
			expect(successNotify).toHaveBeenCalledWith(
				`User ${enabled ? "enabled" : "disabled"}`
			);
			expect(wrapper.get("[data-enabled]").text()).toBe(String(enabled));
			wrapper.unmount();
			queryClient.clear();
		}
	);
});
