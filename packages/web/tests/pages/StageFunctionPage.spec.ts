import { mount } from "@vue/test-utils";
import { ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

import StageFunctionPage from "@/pages/Stage/StageFunctionsPage.vue";

const stage = ref({
	appName: "console",
	stageName: "dev",
	region: "us-east-1",
	resources: []
});
vi.mock("@sst-console/sdk", () => ({
	ApiError: class ApiError extends Error {}
}));

vi.mock("vue-router", () => ({
	useRoute: () => ({
		name: "stage-functions",
		params: { appName: "console", stageName: "dev" }
	})
}));

vi.mock("@/composables/apps", () => ({
	useStage: () => ({
		isPending: ref(false),
		isError: ref(false),
		data: stage,
		error: ref(),
		refetch: vi.fn()
	})
}));

vi.mock("@/components/App/Detail/Stage", () => ({
	StageDetailErrorState: { template: "<div data-stage-error />" },
	StageDetailLoadingState: { template: "<div data-stage-loading />" },
	FunctionNavigator: {
		props: { functions: { type: Array, required: true } },
		template:
			'<div data-function-navigator :data-count="functions.length" />'
	},
	StageDetailHeader: { template: "<div data-stage-header />" }
}));

vi.mock("@/components/ui/Dashboard", () => ({
	DashboardPage: { template: "<main><slot /></main>" },
	DashboardPageBreadcrumbs: { template: "<nav />" },
	DashboardPageContent: { template: "<section><slot /></section>" }
}));

describe("StageFunctionPage", () => {
	beforeEach(() => {
		stage.value = {
			appName: "console",
			stageName: "dev",
			region: "us-east-1",
			resources: []
		};
	});

	it("shows deployed Function navigator", () => {
		const wrapper = mount(StageFunctionPage);

		expect(wrapper.find("[data-function-navigator]").exists()).toBe(true);
		expect(wrapper.find("[data-stage-header]").exists()).toBe(true);
	});
});
