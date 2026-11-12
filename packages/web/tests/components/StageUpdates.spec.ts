import { mount, flushPromises } from "@vue/test-utils";
import { ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StageUpdates from "@/components/App/Detail/Stage/StageUpdates.vue";

const data = ref([{ updateId: "one", command: "deploy" }]);
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
	});
	it("shows partial history and operation-only failures", async () => {
		const wrapper = render();
		expect(wrapper.text()).toContain("Unprocessed");
		expect(wrapper.text()).toContain("Change counts unavailable");
		await wrapper.findAll("button")[1]!.trigger("click");
		expect(wrapper.text()).toContain("No snapshot change observed");
		expect(wrapper.text()).toContain("Operation: failed");
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
