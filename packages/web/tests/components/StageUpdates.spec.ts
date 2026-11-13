import { mount, flushPromises } from "@vue/test-utils";
import type { StateUpdate } from "@sst-console/sdk";
import { ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StageUpdates from "@/components/App/Detail/Stage/StageUpdates.vue";
import UpdateResourceEvents from "@/components/App/Detail/Stage/Updates/UpdateResourceEvents.vue";

const data = ref<StateUpdate[]>([{ updateId: "one", command: "deploy" }]);
const discover = vi.fn();
const process = vi.fn();
const { notify } = vi.hoisted(() => ({ notify: vi.fn() }));

vi.mock("quasar", () => ({ Notify: { create: notify } }));
vi.mock("@/boot/api-client", () => ({ handleApiError: vi.fn() }));
vi.mock("@/composables/state-history", () => ({
	useStateHistory: () => ({
		data: {
			get value() {
				return { pages: [{ items: data.value }] };
			}
		},
		isPending: ref(false),
		isError: ref(false),
		hasNextPage: ref(false),
		isFetchNextPageError: ref(false),
		isFetchingNextPage: ref(false),
		isFetching: ref(false),
		fetchNextPage: vi.fn(),
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
	QScrollArea: { template: "<div><slot /></div>" },
	QInfiniteScroll: { template: "<div><slot /></div>" },
	QTimeline: { template: "<div><slot /></div>" },
	QTimelineEntry: {
		props: ["color"],
		template: '<div :data-color="color"><slot /></div>'
	},
	QBadge: { props: ["label"], template: "<span>{{ label }}</span>" },
	QTooltip: true,
	QList: { template: "<div><slot /></div>" },
	QItemSection: { template: "<div><slot /></div>" },
	QItemLabel: { template: "<div><slot /></div>" },
	QExpansionItem: { template: "<div><slot /></div>" },
	QSeparator: true,
	QIcon: true
};

function render(desktop = true) {
	return mount(StageUpdates, {
		props: {
			historyKey: { accountId: "123", appName: "app", stageName: "prod" }
		},
		global: {
			stubs,
			directives: { closePopup: {} },
			mocks: { $q: { screen: { gt: { sm: desktop } } } }
		}
	});
}

describe("StageUpdates", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		data.value = [{ updateId: "one", command: "deploy" }];
	});
	it("uses a scroll region on desktop and page scrolling on smaller screens", () => {
		expect(render().find('[aria-label="Update history"]').exists()).toBe(
			true
		);
		const mobile = render(false);
		expect(mobile.find('[aria-label="Update history"]').exists()).toBe(
			false
		);
		expect(mobile.find(".update-item").exists()).toBe(true);
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
		expect(wrapper.find('[aria-label="2 created"]').text()).toContain("+2");
		expect(wrapper.find('[aria-label="0 deleted"]').exists()).toBe(false);
		expect(wrapper.find('[aria-label="2 created"]').classes()).toContain(
			"text-positive"
		);
		expect(wrapper.find('[aria-label="Resource changes"]').exists()).toBe(
			true
		);
		expect(wrapper.text()).toContain("12.0s");
		expect(wrapper.text()).toContain("Changes unavailable");
		await wrapper.findAll(".update-item")[0]!.trigger("click");
		expect(wrapper.text()).toContain("Resource events");
	});
	it("shows partial history and operation-only failures", async () => {
		const wrapper = render();
		expect(wrapper.find(".update-item").attributes("title")).toBe(
			"Unprocessed"
		);
		expect(wrapper.text()).toContain("Changes unavailable");
		await wrapper.findAll("button")[1]!.trigger("click");
		expect(wrapper.text()).toContain("Operation: failed");
	});
	it("shows no changes without zero counts or unchanged totals", () => {
		data.value = [
			{
				updateId: "one",
				resourceCounts: {
					created: 0,
					updated: 0,
					deleted: 0,
					unchanged: 104
				}
			}
		];
		const wrapper = render();
		const item = wrapper.find(".update-item");
		expect(item.text()).toContain("No changes");
		expect(item.text()).not.toContain("104");
		expect(item.find(".change-bar").exists()).toBe(false);
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

describe("UpdateResourceEvents", () => {
	it("switches between action groups and operation time, keeping untimed events last", async () => {
		const wrapper = mount(UpdateResourceEvents, {
			props: {
				events: [
					{
						resourceId: "late",
						urn: "urn:pulumi:stage::app::aws:lambda/function:Function::Worker",
						resourceType: "aws:lambda/function:Function",
						action: "deleted",
						operation: {
							startedAt: "2026-11-12T10:00:02Z",
							completedAt: "2026-11-12T10:00:04Z",
							outcome: "succeeded"
						}
					},
					{
						resourceId: "untimed",
						urn: "unknown",
						resourceType: "custom",
						action: "created"
					},
					{
						resourceId: "early",
						urn: "first",
						resourceType: "custom",
						action: "updated",
						operation: {
							startedAt: "2026-11-12T10:00:01Z",
							outcome: "unknown"
						}
					}
				]
			},
			global: { stubs }
		});
		expect(
			wrapper.findAll(".resource-event").map(row => row.text())
		).toEqual([
			expect.stringContaining("unknown"),
			expect.stringContaining("first"),
			expect.stringContaining("Worker")
		]);
		await wrapper
			.findAll("button")
			.find(button => button.text() === "By time")!
			.trigger("click");
		expect(
			wrapper.findAll(".resource-event").map(row => row.text())
		).toEqual([
			expect.stringContaining("first"),
			expect.stringContaining("Worker"),
			expect.stringContaining("unknown")
		]);
		expect(wrapper.text()).toContain("(2.0s)");
	});
});
