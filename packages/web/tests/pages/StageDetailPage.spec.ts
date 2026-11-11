import { mount } from "@vue/test-utils";
import { reactive, ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StageDetailPage from "@/pages/Stage/StageDetailPage.vue";

const route = reactive({
	name: "stage-detail",
	params: { appName: "app", stageName: "dev" },
	query: {} as Record<string, string>
});
const push = vi.fn();
const pending = ref(false);
const issuesError = ref(false);
const issues = ref<{ status: string; appName: string; stageName: string }[]>(
	[]
);
const mutate = vi.fn();
const stage = ref({
	appName: "app",
	stageName: "dev",
	accountId: "123456789012",
	region: "us-east-1",
	state: undefined,
	issueMonitoringEnabled: false,
	resources: []
});

vi.mock("@sst-console/sdk", () => ({
	ApiError: class ApiError extends Error {}
}));
vi.mock("vue-router", () => ({
	useRoute: () => route,
	useRouter: () => ({ push })
}));
vi.mock("@/composables/apps", () => ({
	useStage: () => ({
		data: stage,
		isPending: pending,
		isError: ref(false),
		error: ref(),
		refetch: vi.fn()
	}),
	useSetStageIssueMonitoring: () => ({ isPending: ref(false), mutate })
}));
vi.mock("@/composables/issues", () => ({
	useIssues: () => ({ data: issues, isError: issuesError })
}));
vi.mock("@/components/App/Detail/Stage/StageUpdates.vue", () => ({
	default: { template: "<div data-updates />" }
}));
vi.mock("@/components/App/Detail/Stage", () => ({
	ResourceExplorer: {
		props: ["resources", "loading"],
		template: '<div data-explorer :data-loading="loading" />'
	},
	StageDetailErrorState: { template: "<div data-error />" }
}));
vi.mock("@/components/ui/Dashboard", () => ({
	DashboardPage: { template: "<main><slot /></main>" },
	DashboardPageBreadcrumbs: { template: "<nav />" },
	DashboardPageContent: { template: "<section><slot /></section>" },
	DashboardPageHeader: {
		template:
			'<header><slot name="subtitle" /><slot name="actions" /></header>'
	}
}));

const stubs = {
	QSkeleton: true,
	RouterLink: { template: "<a><slot /></a>" },
	QBtn: {
		props: ["label", "to", "disable"],
		template:
			'<button :disabled="disable" :data-label="label"><slot /></button>'
	},
	QMenu: { template: "<div><slot /></div>" },
	QList: { template: "<div><slot /></div>" },
	QItemLabel: { template: "<div><slot /></div>" },
	QItem: { template: "<button @click=\"$emit('click')\"><slot /></button>" },
	QItemSection: { template: "<span><slot /></span>" }
};

function render() {
	return mount(StageDetailPage, {
		global: { stubs, directives: { closePopup: {} } }
	});
}

describe("StageDetailPage", () => {
	beforeEach(() => {
		route.query = {};
		issues.value = [];
		issuesError.value = false;
		pending.value = false;
		push.mockReset();
		mutate.mockReset();
	});
	it("updates issue monitoring from the menu item", async () => {
		const wrapper = render();
		await wrapper.find('[role="menuitemcheckbox"]').trigger("click");
		expect(mutate).toHaveBeenCalledWith({
			appName: "app",
			stageName: "dev",
			enabled: true
		});
	});
	it("renders section loading states and disables actions while stage loads", () => {
		pending.value = true;
		const wrapper = render();
		expect(wrapper.find("[data-explorer]").attributes("data-loading")).toBe(
			"true"
		);
		expect(
			wrapper.find('[aria-label="Loading stage context"]').exists()
		).toBe(true);
		expect(
			wrapper.find('[aria-label="Stage actions"]').attributes("disabled")
		).toBeDefined();
	});
	it("uses URL tabs and keeps updates empty", async () => {
		const wrapper = render();
		await wrapper.findAll('[role="tab"]')[1]!.trigger("click");
		expect(push).toHaveBeenCalledWith({ query: { tab: "updates" } });
		route.query = { tab: "updates" };
		await wrapper.vm.$nextTick();
		expect(wrapper.find("[data-explorer]").exists()).toBe(false);
		await wrapper.findAll('[role="tab"]')[0]!.trigger("click");
		expect(push).toHaveBeenLastCalledWith({ query: { tab: undefined } });
	});
	it("only links to matching open issues when the query succeeds", async () => {
		issues.value = [
			{ status: "open", appName: "app", stageName: "dev" },
			{ status: "open", appName: "other", stageName: "dev" }
		];
		const wrapper = render();
		expect(wrapper.find('[aria-label="1 open issue"]').exists()).toBe(true);
		issuesError.value = true;
		await wrapper.vm.$nextTick();
		expect(wrapper.find('[aria-label="1 open issue"]').exists()).toBe(
			false
		);
	});
});
