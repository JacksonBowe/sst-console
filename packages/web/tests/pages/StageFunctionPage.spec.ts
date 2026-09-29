import { mount } from "@vue/test-utils";
import { nextTick, reactive, ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

import StageFunctionPage from "@/pages/Stage/StageFunctionsPage.vue";

const stage = ref({
	appName: "console",
	stageName: "dev",
	region: "us-east-1",
	resources: []
});
const localSession = reactive({
	status: "connected",
	identity: undefined as
		| { app: string; stage: string; region?: string }
		| undefined,
	invocations: [] as unknown[],
	lastEventAt: undefined as number | undefined,
	clear: vi.fn()
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

vi.mock("@/composables/local", () => ({
	localSessionMatchesStage: (
		localIdentity: typeof localSession.identity,
		currentStage: typeof stage.value | undefined
	) =>
		Boolean(
			localIdentity &&
			currentStage &&
			localIdentity.app === currentStage.appName &&
			localIdentity.stage === currentStage.stageName &&
			(!localIdentity.region ||
				localIdentity.region === currentStage.region)
		)
}));

vi.mock("@/stores/local-session", () => ({
	useLocalSessionStore: () => localSession
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
	StageDetailHeader: { template: "<div data-stage-header />" }
}));

vi.mock("@/components/ui/Dashboard", () => ({
	DashboardPage: { template: "<main><slot /></main>" },
	DashboardPageBreadcrumbs: { template: "<nav />" },
	DashboardPageContent: { template: "<section><slot /></section>" }
}));

describe("StageFunctionPage", () => {
	beforeEach(() => {
		localSession.identity = undefined;
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
		expect(wrapper.find("[data-stage-header]").exists()).toBe(true);
	});

	it("shows local invocation workspace for matching local session", async () => {
		const wrapper = mount(StageFunctionPage);
		localSession.identity = {
			app: "console",
			stage: "dev",
			region: "us-east-1"
		};
		await nextTick();

		expect(wrapper.find("[data-function-workspace]").exists()).toBe(true);
		expect(wrapper.find("[data-function-navigator]").exists()).toBe(false);
	});
});
