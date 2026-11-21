import { mount } from "@vue/test-utils";
import { defineComponent } from "vue";
import { describe, expect, it, vi } from "vitest";

import type { AppStage } from "@sst-console/sdk";
import AppStagesTable from "@/components/App/Detail/AppStagesTable.vue";

const push = vi.fn();
vi.mock("vue-router", () => ({ useRouter: () => ({ push }) }));
const stage: AppStage = {
	stageName: "dev",
	accountId: "123456789012",
	region: "ap-southeast-2",
	issueMonitoringEnabled: false,
	createdAt: "2026-10-13T00:00:00.000Z",
	updatedAt: "2026-10-13T00:00:00.000Z",
	state: null,
	resourceCount: 1
};
const stages = Array.from({ length: 15 }, (_, index) => ({
	...stage,
	stageName: index ? `stage-${index}` : "dev",
	issueMonitoringEnabled: index === 1,
	state:
		index === 1
			? {
					accountId: stage.accountId,
					appName: "console",
					stageName: `stage-${index}`,
					sourceBucket: "state-bucket",
					sourceKey: "state.json",
					observedAt: "2026-10-13T00:00:00.000Z"
				}
			: null
}));

const BaseTable = defineComponent({
	props: ["rows", "grid", "rowsPerPageOptions", "hidePagination"],
	template: `<div>
		<template v-for="row in rows" :key="row.stageName">
			<slot v-if="grid" name="item" :row="row" />
			<template v-else>
				<slot name="body-cell-stageName" :row="row" />
				<slot name="body-cell-accountId" :row="row" />
				<slot name="body-cell-actions" :row="row" />
			</template>
		</template>
	</div>`
});
const QBtn = defineComponent({
	props: ["label", "disable", "loading"],
	emits: ["click"],
	template: `<button :disabled="disable" :data-loading="loading" @click="$emit('click', $event)">{{ label }}</button>`
});
function render(mobile: boolean, updatingStageName?: string) {
	return mount(AppStagesTable, {
		props: { appName: "console", stages, updatingStageName },
		global: {
			mocks: { $q: { screen: { lt: { md: mobile } } } },
			stubs: {
				BaseTable,
				QBtn,
				QCard: { template: "<article><slot /></article>" },
				QCardSection: { template: "<div><slot /></div>" },
				QTd: { template: "<div><slot /></div>" },
				QBadge: {
					props: ["label"],
					template: "<span>{{ label }}</span>"
				},
				RouterLink: {
					name: "RouterLink",
					props: ["to"],
					template: '<a href="#"><slot /></a>'
				}
			}
		}
	});
}

describe("AppStagesTable", () => {
	it.each([false, true])(
		"shows all stages without pagination (mobile: %s)",
		mobile => {
			const wrapper = render(mobile);
			const table = wrapper.getComponent(BaseTable);
			expect(table.props("rowsPerPageOptions")).toEqual([0]);
			expect(table.props("hidePagination")).toBe("");
			expect(table.props("grid")).toBe(mobile);
			expect(wrapper.findAll("button")).toHaveLength(15);
			expect(wrapper.findAll("article")).toHaveLength(mobile ? 15 : 0);
			expect(wrapper.text()).toContain("Stages");
			expect(wrapper.text()).not.toContain("Scroll horizontally");
		}
	);

	it("keeps long mobile values and links intact in the wrapping card", async () => {
		const wrapper = render(true);
		const longStage = {
			...stage,
			stageName: "stage".repeat(30),
			accountId: "account".repeat(30),
			region: "region".repeat(30)
		};
		await wrapper.setProps({ stages: [longStage] } as never);
		const card = wrapper.get(".stage-card");
		expect(card.text()).toContain(longStage.stageName);
		expect(card.text()).toContain(longStage.accountId);
		expect(card.text()).toContain(longStage.region);
		const links = card.findAllComponents({ name: "RouterLink" });
		expect(links[0]!.props("to").params.stageName).toBe(
			longStage.stageName
		);
		expect(links[1]!.props("to").params.accountId).toBe(
			longStage.accountId
		);
	});

	it("shows mobile stage details, links and monitoring actions", async () => {
		push.mockClear();
		const wrapper = render(true);
		const cards = wrapper.findAll("article");
		const card = cards[0]!;
		expect(cards[1]!.get('[title="state.json"]').text()).not.toBe("");
		expect(cards[1]!.text()).toContain("Enabled");
		for (const text of [
			"dev",
			"123456789012",
			"ap-southeast-2",
			"Resources",
			"No state",
			"Updated",
			"Disabled"
		])
			expect(card.text()).toContain(text);
		const links = card.findAllComponents({ name: "RouterLink" });
		expect(links[0]!.props("to")).toEqual({
			name: "stage-detail",
			params: { appName: "console", stageName: "dev" }
		});
		expect(links[1]!.props("to")).toEqual({
			name: "account-detail",
			params: { accountId: stage.accountId }
		});
		await links[1]!.trigger("click");
		expect(push).not.toHaveBeenCalled();
		await card.get("button").trigger("click");
		expect(wrapper.emitted("monitoring")).toEqual([[stages[0], true]]);
		expect(push).not.toHaveBeenCalled();
		await cards[1]!.get("button").trigger("click");
		expect(wrapper.emitted("monitoring")![1]).toEqual([stages[1], false]);
		await card.trigger("click");
		expect(push).toHaveBeenCalledWith({
			name: "stage-detail",
			params: { appName: "console", stageName: "dev" }
		});
	});

	it("emits desktop monitoring actions without opening the stage", async () => {
		push.mockClear();
		const wrapper = render(false);
		await wrapper.findAll("button")[0]!.trigger("click");
		expect(wrapper.emitted("monitoring")).toEqual([[stages[0], true]]);
		expect(push).not.toHaveBeenCalled();
	});

	it.each([false, true])(
		"disables all actions and loads only updating stage (mobile: %s)",
		mobile => {
			const buttons = render(mobile, "dev").findAll("button");
			expect(
				buttons.every(
					button => button.attributes("disabled") !== undefined
				)
			).toBe(true);
			expect(buttons[0]!.attributes("data-loading")).toBe("true");
			expect(buttons[1]!.attributes("data-loading")).toBe("false");
		}
	);
});
