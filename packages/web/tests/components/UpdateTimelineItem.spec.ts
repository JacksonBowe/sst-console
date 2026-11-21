import { mount } from "@vue/test-utils";
import type { StateUpdate } from "@sst-console/sdk";
import { describe, expect, it } from "vitest";
import UpdateTimelineItem from "@/components/App/Detail/Stage/Updates/UpdateTimelineItem.vue";

const processedAt = "2026-11-12T10:00:00Z";
const timeCompleted = "2026-11-12T10:00:12Z";

describe("UpdateTimelineItem", () => {
	it.each([
		[{ processedAt, timeCompleted, errors: [] }, true, "Succeeded"],
		[
			{
				processedAt,
				timeCompleted,
				errors: [{ urn: "worker", message: "failed" }]
			},
			true,
			"Failed"
		],
		[{ processedAt }, false, "Incomplete"],
		[{ processedAt }, true, "Possibly in progress"],
		[{ processedAt, timeCompleted }, true, "Unknown"],
		[{}, true, "Unprocessed"]
	])(
		"shows %s status in the selectable row",
		async (fields, isNewest, label) => {
			const update: StateUpdate = {
				updateId: "one",
				command: "deploy",
				...fields
			};
			const wrapper = mount(UpdateTimelineItem, {
				props: { update, isNewest },
				global: {
					stubs: {
						QItem: {
							emits: ["click"],
							template:
								"<button @click=\"$emit('click')\"><slot /></button>"
						},
						QItemSection: { template: "<div><slot /></div>" },
						QTooltip: true,
						QIcon: true
					}
				}
			});

			if (update.processedAt) {
				const status = wrapper.find('.update-metrics [title="Status"]');
				expect(status.text()).toBe(label);
				expect(status.isVisible()).toBe(true);
				expect(wrapper.text()).toContain("deploy");
			} else {
				expect(wrapper.text()).toContain(update.updateId);
				expect(wrapper.text()).toContain(
					"Update not processed yet - select to process."
				);
				expect(wrapper.text()).not.toContain("unavailable");
			}
			expect(wrapper.attributes("title")).toBe(label);
			await wrapper.trigger("click");
			expect(wrapper.emitted("select")).toHaveLength(1);
		}
	);
});
