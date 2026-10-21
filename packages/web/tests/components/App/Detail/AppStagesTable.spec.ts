import { mount } from "@vue/test-utils";
import { defineComponent } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it } from "vitest";

import type { AppStage } from "@sst-console/sdk";

import AppStagesTable from "@/components/App/Detail/AppStagesTable.vue";

const stage: AppStage = {
	stageName: "dev",
	accountId: "123456789012",
	region: "ap-southeast-2",
	issueMonitoringEnabled: false,
	createdAt: "2026-10-13T00:00:00.000Z",
	updatedAt: "2026-10-13T00:00:00.000Z",
	latestSnapshot: null,
	resourceCount: 1
};

const BaseTable = defineComponent({
	props: { rows: { type: Array, required: true } },
	template: "<div><slot name='body-cell-actions' :row='rows[0]' /></div>"
});

const QBtn = defineComponent({
	emits: ["click"],
	props: {
		disable: Boolean,
		label: { type: String, required: true }
	},
	template:
		"<button :disabled='disable' @click='$emit(\"click\", $event)'>{{ label }}</button>"
});

describe("AppStagesTable", () => {
	it("emits an enable request for an unmonitored Stage", async () => {
		const router = createRouter({
			history: createMemoryHistory(),
			routes: [{ path: "/", component: { template: "" } }]
		});
		await router.push("/");
		await router.isReady();

		const wrapper = mount(AppStagesTable, {
			props: { appName: "console", stages: [stage] },
			global: {
				plugins: [router],
				stubs: {
					BaseTable,
					QBtn,
					QTd: { template: "<div><slot /></div>" },
					QBadge: true
				}
			}
		});

		expect(wrapper.get("button").text()).toBe("Enable monitoring");
		await wrapper.get("button").trigger("click");
		expect(wrapper.emitted("monitoring")).toEqual([[stage, true]]);
	});
});
