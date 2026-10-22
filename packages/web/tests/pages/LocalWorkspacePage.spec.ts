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

	it("passes only current stage Function resources to local activity", () => {
		const wrapper = mount(LocalWorkspacePage, {
			global: {
				stubs: {
					LocalWorkspace,
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
