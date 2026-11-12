import { mount, flushPromises } from "@vue/test-utils";
import type { StateUpdate } from "@sst-console/sdk";
import { ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StageUpdates from "@/components/App/Detail/Stage/StageUpdates.vue";

const data = ref<StateUpdate[]>([{ updateId: "one", command: "deploy" }]);
const discover = vi.fn();
const process = vi.fn();
const { notify } = vi.hoisted(() => ({ notify: vi.fn() }));

vi.mock("quasar", () => ({ Notify: { create: notify } }));
vi.mock("@/boot/api-client", () => ({ handleApiError: vi.fn() }));
vi.mock("@/composables/state-history", () => ({
	useStateHistory: () => ({
		data,
		isPending: ref(false),
		isError: ref(false),
		refetch: vi.fn()
	}),
	useStateUpdateDetail: () => ({
		data: ref({
			update: { updateId: "one", command: "deploy" },
			snapshot: null,
			eventLog: null,
			events: [
				{
					resourceId: "r",
					urn: "worker",
					resourceType: "lambda",
					action: "created",
					operation: { outcome: "failed" }
				}
			]
		}),
		isPending: ref(false),
		isError: ref(false),
		refetch: vi.fn()
	}),
	useDiscoverStateHistory: () => ({
		mutateAsync: discover,
		isPending: ref(false)
	}),
	useProcessStateHistory: () => ({
		mutateAsync: process,
		isPending: ref(false)
	})
}));

const stubs = {
	QBtn: {
		props: ["label"],
		template:
			"<button @click=\"$emit('click')\">{{ label }}<slot /></button>"
	},
	QItem: { template: "<button @click=\"$emit('click')\"><slot /></button>" },
	QDialog: {
		props: ["modelValue"],
		template: '<div v-if="modelValue"><slot /></div>'
	},
	QCard: { template: "<div><slot /></div>" },
	QCardSection: { template: "<div><slot /></div>" },
	QCardActions: { template: "<div><slot /></div>" },
	QTimeline: { template: "<div><slot /></div>" },
	QTimelineEntry: {
		props: ["color"],
		template: '<div :data-color="color"><slot /></div>'
	},
	QBadge: { props: ["label"], template: "<span>{{ label }}</span>" },
	QList: { template: "<div><slot /></div>" },
	QItemSection: { template: "<div><slot /></div>" },
	QItemLabel: { template: "<div><slot /></div>" },
	QExpansionItem: { template: "<div><slot /></div>" },
	QSeparator: true,
	QIcon: true
};

function render() {
	return mount(StageUpdates, {
		props: {
			historyKey: { accountId: "123", appName: "app", stageName: "prod" }
		},
		global: { stubs, directives: { closePopup: {} } }
	});
}

describe("StageUpdates", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		data.value = [{ updateId: "one", command: "deploy" }];
	});
	it("renders update status and change counts in selectable timeline rows", async () => {
		data.value = [
			{
				updateId: "one",
				command: "deploy",
				processedAt: "2026-11-12T10:00:00Z",
				timeStarted: "2026-11-12T10:00:00Z",
				timeCompleted: "2026-11-12T10:00:12Z",
				errors: [],
				resourceCounts: {
					created: 2,
					updated: 1,
					deleted: 0,
					unchanged: 4
				}
			},
			{
				updateId: "two",
				command: "refresh",
				processedAt: "2026-11-12T10:00:00Z",
				timeCompleted: "2026-11-12T10:00:12Z",
				errors: [{ urn: "worker", message: "failed" }]
			}
		];
		const wrapper = render();
		expect(wrapper.findAll(".update-item")[0]!.attributes("title")).toBe(
			"Succeeded"
		);
		expect(wrapper.findAll(".update-item")[1]!.attributes("title")).toBe(
			"Failed"
		);
		expect(wrapper.text()).toContain("Created 2");
		expect(wrapper.text()).toContain("Deleted 0");
		expect(wrapper.text()).toContain("12.0s");
		expect(wrapper.text()).toContain("Snapshot change counts unavailable");
		await wrapper.findAll(".update-item")[0]!.trigger("click");
		expect(wrapper.text()).toContain("Resource events");
		expect(wrapper.text()).toContain(
			"totals can differ from snapshot changes"
		);
	});
	it("shows partial history and operation-only failures", async () => {
		const wrapper = render();
		expect(wrapper.find(".update-item").attributes("title")).toBe(
			"Unprocessed"
		);
		expect(wrapper.text()).toContain("Snapshot change counts unavailable");
		await wrapper.findAll("button")[1]!.trigger("click");
		expect(wrapper.text()).toContain("No snapshot change observed");
		expect(wrapper.text()).toContain("Operation: failed");
	});
	it("marks only the newest unfinished processed update as possibly in progress", () => {
		data.value = [
			{ updateId: "newest", processedAt: "2026-11-12T10:00:00Z" },
			{ updateId: "older", processedAt: "2026-11-12T09:00:00Z" },
			{ updateId: "unprocessed" }
		];
		const wrapper = render();
		const items = wrapper.findAll(".update-item");
		expect(items.map(item => item.attributes("title"))).toEqual([
			"Possibly in progress",
			"Incomplete",
			"Unprocessed"
		]);
		expect(
			wrapper
				.findAll("[data-color]")
				.map(item => item.attributes("data-color"))
		).toEqual(["primary", "grey", "warning"]);
	});
	it("shows discovery failures without calling them processed", async () => {
		discover.mockResolvedValue({
			processed: 2,
			skipped: 1,
			failed: 1,
			failures: [{ key: "snapshot/key", reason: "failed" }],
			failuresTruncated: true
		});
		const wrapper = render();
		await wrapper.find("button").trigger("click");
		await flushPromises();
		expect(wrapper.text()).toContain("2 discovered · 1 skipped · 1 failed");
		expect(wrapper.text()).toContain("snapshot/key");
		expect(wrapper.text()).toContain("Additional failures omitted");
	});
	it("reports that processing is queued", async () => {
		process.mockResolvedValue({ published: 2 });
		const wrapper = render();
		await wrapper.findAll("button")[1]!.trigger("click");
		const button = wrapper
			.findAll("button")
			.find(item => item.text() === "Process");
		await button!.trigger("click");
		await flushPromises();
		expect(process).toHaveBeenCalledWith({
			key: { accountId: "123", appName: "app", stageName: "prod" },
			updateId: "one"
		});
		expect(notify).toHaveBeenCalledWith(
			expect.objectContaining({
				message: expect.stringContaining("2 artifacts queued")
			})
		);
	});
});
