import { mount } from "@vue/test-utils";
import { defineComponent } from "vue";
import { describe, expect, it, vi } from "vitest";

import AccountsTable from "@/components/Accounts/AccountsTable.vue";

const push = vi.fn();
vi.mock("vue-router", () => ({ useRouter: () => ({ push }) }));

const accounts = [
	{ accountId: "123456789012", region: "us-east-1", status: "connected" },
	{ accountId: "123456789013", region: "eu-west-1", status: "disconnected" }
];
const BaseTable = defineComponent({
	props: ["rows", "grid", "loading", "rowsPerPageOptions", "hidePagination"],
	template: `
		<div>
			<template v-if="rows.length">
				<template v-for="row in rows" :key="row.accountId">
					<slot v-if="grid" name="item" :row="row" />
					<slot v-else name="body-cell-accountId" :row="row" />
				</template>
			</template>
			<slot v-else name="no-data" />
		</div>`
});
const QBtn = defineComponent({
	props: ["label", "disable"],
	emits: ["click"],
	template:
		'<button :disabled="disable" @click="$emit(\'click\', $event)">{{ label }}</button>'
});

function render(mobile: boolean, rows = accounts, loading = false) {
	return mount(AccountsTable, {
		props: { accounts: rows as never, loading },
		global: {
			mocks: { $q: { screen: { lt: { sm: mobile } } } },
			stubs: {
				BaseTable,
				QBtn,
				QCard: { template: "<article><slot /></article>" },
				QCardSection: { template: "<div><slot /></div>" },
				QTd: { template: "<div><slot /></div>" },
				QBadge: { template: "<span><slot /></span>" },
				QIcon: true,
				RouterLink: {
					props: ["to"],
					template: '<a href="#"><slot /></a>'
				},
				CopyValue: {
					props: ["value"],
					template:
						'<button aria-label="Copy account ID">{{ value }}</button>'
				},
				ConnectAccountTrigger: true
			}
		}
	});
}

describe("AccountsTable", () => {
	it("shows mobile account cards with navigation, copy, status and sync", async () => {
		push.mockClear();
		const wrapper = render(true);
		const cards = wrapper.findAll("article");
		expect(cards).toHaveLength(2);
		expect(cards[0]!.text()).toContain("123456789012");
		expect(cards[0]!.text()).toContain("us-east-1");
		expect(cards[0]!.text()).toContain("Connected");
		expect(cards[1]!.text()).toContain("Disconnected");
		expect(cards[0]!.find('[aria-label="Copy account ID"]').exists()).toBe(
			true
		);
		expect(cards[0]!.get("a").attributes("href")).toBe("#");
		expect(
			cards[1]!.findAll("button")[1]!.attributes("disabled")
		).toBeDefined();

		await cards[0]!.get('[aria-label="Copy account ID"]').trigger("click");
		expect(push).not.toHaveBeenCalled();
		await cards[0]!.findAll("button")[1]!.trigger("click");
		expect(wrapper.emitted("sync")).toEqual([[accounts[0]]]);
		expect(push).not.toHaveBeenCalled();
		await cards[0]!.trigger("click");
		expect(push).toHaveBeenCalledWith({
			name: "account-detail",
			params: { accountId: "123456789012" }
		});
	});

	it("keeps desktop table and shows all accounts without pagination", () => {
		const wrapper = render(false);
		expect(wrapper.findAll("article")).toHaveLength(0);
		expect(wrapper.findAll("a")).toHaveLength(2);
		expect(
			wrapper.getComponent(BaseTable).props("rowsPerPageOptions")
		).toEqual([0]);
		expect(wrapper.getComponent(BaseTable).props("hidePagination")).toBe(
			""
		);
	});

	it("keeps the empty state hidden while loading", () => {
		expect(render(true, []).text()).toContain("No accounts connected");
		expect(render(true, [], true).text()).not.toContain(
			"No accounts connected"
		);
	});
});
