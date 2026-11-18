import { mount } from "@vue/test-utils";
import { ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LocalWorkspacePage from "@/pages/LocalWorkspacePage.vue";

const state = vi.hoisted(() => ({
	route: {
		name: "stage-local-workspace",
		params: { appName: "console", stageName: "dev" }
	},
	stage: {
		resources: [] as Array<Record<string, unknown>>
	},
	localSession: {
		identity: { app: "console", stage: "dev" },
		invocations: [],
		status: "connected",
		isStreaming: true,
		lastEventAt: undefined,
		clear: vi.fn(),
		toggleStreaming: vi.fn()
	}
}));

vi.mock("vue-router", () => ({
	useRoute: () => state.route
}));

vi.mock("@/composables/apps", () => ({
	useStage: () => ({ data: ref(state.stage) })
}));

vi.mock("@/stores/local-session", () => ({
	useLocalSessionStore: () => state.localSession
}));

const LocalWorkspace = {
	props: { functionOptions: { type: Array, required: true } },
	template:
		'<div data-function-options :data-options="JSON.stringify(functionOptions)" />'
};

describe("LocalWorkspacePage", () => {
	beforeEach(() => {
		state.route.name = "stage-local-workspace";
		state.localSession.identity = { app: "console", stage: "dev" };
		state.localSession.status = "connected";
		state.localSession.isStreaming = true;
		state.stage.resources = [
			{
				resourceId: "api",
				resourceType: "sst.aws.Api",
				children: [
					{
						resourceId: "checkout",
						name: "Checkout",
						resourceType: "sst.aws.Function",
						children: []
					}
				]
			},
			{
				resourceId: "users",
				resourceType: "sst.aws.Dynamo",
				children: []
			}
		];
	});

	it.each([
		["disconnected", true, "active"],
		["connecting", true, "active"],
		["connected", true, "active"],
		["connected", false, "paused"],
		["disconnected", false, "paused"]
	])(
		"shows %s connection and %s streaming preference",
		(status, streaming, label) => {
			state.localSession.status = status;
			state.localSession.isStreaming = streaming;
			const wrapper = mount(LocalWorkspacePage, {
				global: {
					stubs: {
						LocalWorkspace,
						DashboardPageBreadcrumbs: true,
						DashboardPageHeader: {
							template: '<header><slot name="actions" /></header>'
						},
						QIcon: true,
						QSeparator: true
					}
				}
			});
			expect(wrapper.text()).toContain(
				`WebSocket ${status[0]!.toUpperCase()}${status.slice(1)}`
			);
			expect(wrapper.text()).toContain(`Streaming ${label}`);
			expect(wrapper.findAll("q-icon-stub")[1]!.attributes("color")).toBe(
				streaming ? "positive" : "warning"
			);
			expect(wrapper.text()).not.toContain("Streaming live");
			if (status === "disconnected")
				expect(wrapper.text()).toContain("Connection lost.");
			wrapper.unmount();
		}
	);

	it("explains how to find a matching session", () => {
		state.localSession.identity = { app: "other", stage: "dev" };
		const wrapper = mount(LocalWorkspacePage, {
			global: {
				stubs: {
					DashboardPageBreadcrumbs: true,
					DashboardPage: { template: "<main><slot /></main>" },
					DashboardPageHeader: {
						template: "<header><slot name='actions' /></header>"
					},
					QIcon: true,
					QSeparator: true,
					QCard: { template: "<div><slot /></div>" }
				}
			}
		});
		expect(wrapper.text()).toContain("No matching local session");
		expect(wrapper.text()).toContain(
			"open the workspace for the currently connected session"
		);
		expect(wrapper.text()).not.toContain("other / dev");
		wrapper.unmount();
	});

	it("passes only current stage Function resources to local activity", () => {
		const wrapper = mount(LocalWorkspacePage, {
			global: {
				stubs: {
					LocalWorkspace,
					QPage: { template: "<main><slot /></main>" },
					DashboardPage: { template: "<main><slot /></main>" },
					DashboardPageBreadcrumbs: true,
					DashboardPageContent: {
						template: "<section><slot /></section>"
					},
					DashboardPageHeader: {
						template:
							'<header><slot /><slot name="actions" /></header>'
					},
					QCard: true,
					QIcon: true,
					QSeparator: true
				}
			}
		});

		expect(
			JSON.parse(
				wrapper
					.get("[data-function-options]")
					.attributes("data-options")!
			)
		).toEqual([{ label: "Checkout", value: "Checkout" }]);
	});
});
