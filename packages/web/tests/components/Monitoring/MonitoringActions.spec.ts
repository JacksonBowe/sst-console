import { mount } from "@vue/test-utils";
import { defineComponent } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MonitoringActions from "@/components/Monitoring/MonitoringActions.vue";
import { DialogConfirm } from "@/components/ui/Dialog";

const state = vi.hoisted(() => ({
	dialogCreate: vi.fn(),
	disableMonitoring: vi.fn(),
	purgeIssues: vi.fn(),
	testIssue: vi.fn()
}));

vi.mock("quasar", async importOriginal => ({
	...(await importOriginal<typeof import("quasar")>()),
	Dialog: { create: state.dialogCreate }
}));

vi.mock("@/composables/issues", () => ({
	useDisableAllIssueMonitoring: () => ({
		mutateAsync: state.disableMonitoring
	}),
	usePurgeIssues: () => ({ mutateAsync: state.purgeIssues }),
	useTestIssue: () => ({ mutate: state.testIssue })
}));

vi.mock("@/components/AlertRules", () => ({
	AlertRuleTrigger: defineComponent({ template: "<div />" }),
	NotificationDestinationTrigger: defineComponent({ template: "<div />" })
}));

const QBtn = defineComponent({ template: "<div><slot /></div>" });
const QMenu = defineComponent({ template: "<div><slot /></div>" });
const QList = defineComponent({ template: "<div><slot /></div>" });
const QItem = defineComponent({
	emits: ["click"],
	template: "<button @click=\"$emit('click')\"><slot /></button>"
});
const QItemSection = defineComponent({ template: "<span><slot /></span>" });

describe("MonitoringActions", () => {
	beforeEach(() => {
		state.dialogCreate.mockReset();
		state.disableMonitoring.mockReset();
		state.purgeIssues.mockReset();
		state.testIssue.mockReset();
	});

	it("opens disable monitoring confirmation with its existing mutation", async () => {
		const wrapper = mount(MonitoringActions, {
			props: { tab: "issues" },
			global: { stubs: { QBtn, QMenu, QList, QItem, QItemSection } }
		});

		await wrapper.get("button:nth-of-type(1)").trigger("click");

		expect(state.dialogCreate).toHaveBeenCalledWith({
			component: DialogConfirm,
			componentProps: {
				title: "Disable issue monitoring",
				message:
					"This disables issue monitoring on every monitored stage. Existing log subscriptions are removed asynchronously.",
				validationString: "DISABLE",
				variant: "negative",
				confirmLabel: "Disable monitoring",
				perform: expect.any(Function)
			}
		});

		const dialog = state.dialogCreate.mock.calls[0]?.[0];
		if (!dialog) throw new Error("Expected confirmation dialog");
		const { perform } = dialog.componentProps;
		await perform();
		expect(state.disableMonitoring).toHaveBeenCalledOnce();
	});

	it("opens purge confirmation with its existing mutation", async () => {
		const wrapper = mount(MonitoringActions, {
			props: { tab: "issues" },
			global: { stubs: { QBtn, QMenu, QList, QItem, QItemSection } }
		});

		await wrapper.get("button:nth-of-type(3)").trigger("click");

		expect(state.dialogCreate).toHaveBeenCalledWith({
			component: DialogConfirm,
			componentProps: {
				title: "Delete all issues",
				message: "This permanently deletes every persisted issue.",
				validationString: "DELETE",
				variant: "negative",
				confirmLabel: "Delete all",
				perform: expect.any(Function)
			}
		});

		const dialog = state.dialogCreate.mock.calls[0]?.[0];
		if (!dialog) throw new Error("Expected confirmation dialog");
		const { perform } = dialog.componentProps;
		await perform();
		expect(state.purgeIssues).toHaveBeenCalledOnce();
	});
});
