import { mount } from "@vue/test-utils";
import { nextTick, ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

import StageFunctionPage from "@/pages/StageFunctionPage.vue";

const stage = ref({
	appName: "console",
	stageName: "dev",
	region: "us-east-1",
	resources: []
});
const identity = ref<{ app: string; stage: string; region?: string }>();

vi.mock("@sst-console/sdk", () => ({
	ApiError: class ApiError extends Error {}
}));

vi.mock("vue-router", () => ({
	useRoute: () => ({ params: { appName: "console", stageName: "dev" } })
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

vi.mock("@/composables/local", () => ({
	localSessionMatchesStage: (
		localIdentity: typeof identity.value,
		currentStage: typeof stage.value | undefined
	) =>
		Boolean(
			localIdentity &&
			currentStage &&
			localIdentity.app === currentStage.appName &&
			localIdentity.stage === currentStage.stageName &&
			(!localIdentity.region ||
				localIdentity.region === currentStage.region)
		),
	useLocalSession: () => ({
		status: ref("connected"),
		identity,
		invocations: ref([]),
		lastEventAt: ref(),
		clear: vi.fn()
	})
}));

vi.mock("@/components/App/Detail/Stage", () => ({
	StageDetailErrorState: { template: "<div data-stage-error />" },
	StageDetailLoadingState: { template: "<div data-stage-loading />" },
	FunctionInvocationWorkspace: {
		template: "<div data-function-workspace />"
	},
	FunctionNavigator: {
		props: { functions: { type: Array, required: true } },
		template:
			'<div data-function-navigator :data-count="functions.length" />'
	},
	FunctionPageHeader: {
		template:
			'<div data-function-header><slot name="sessionStatus" /></div>'
	},
	LocalFunctionSessionStatus: {
		template: "<div data-session-status />"
	}
}));

vi.mock("@/components/ui/Dashboard", () => ({
	DashboardPage: { template: "<main><slot /></main>" },
	DashboardPageBreadcrumbs: { template: "<nav />" },
	DashboardPageContent: { template: "<section><slot /></section>" }
}));

describe("StageFunctionPage", () => {
	beforeEach(() => {
		identity.value = undefined;
		stage.value = {
			appName: "console",
			stageName: "dev",
			region: "us-east-1",
			resources: []
		};
	});

	it("shows deployed Function navigator without matching local session", () => {
		const wrapper = mount(StageFunctionPage);

		expect(wrapper.find("[data-function-navigator]").exists()).toBe(true);
		expect(wrapper.find("[data-function-workspace]").exists()).toBe(false);
		expect(wrapper.find("[data-session-status]").exists()).toBe(false);
	});

	it("shows local invocation workspace for matching local session", async () => {
		const wrapper = mount(StageFunctionPage);
		identity.value = {
			app: "console",
			stage: "dev",
			region: "us-east-1"
		};
		await nextTick();

		expect(wrapper.find("[data-function-workspace]").exists()).toBe(true);
		expect(wrapper.find("[data-function-navigator]").exists()).toBe(false);
		expect(wrapper.find("[data-session-status]").exists()).toBe(true);
	});
});
