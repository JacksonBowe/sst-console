import { mount } from "@vue/test-utils";
import { defineComponent } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it } from "vitest";

import AppDrawerItem from "@/components/ui/Drawer/AppDrawerItem.vue";

const QItem = defineComponent({
	props: { active: Boolean, to: String },
	template:
		'<div data-drawer-item :data-active="active" :data-to="to"><slot /></div>'
});

const stubs = {
	QItem,
	QItemSection: { template: "<div><slot /></div>" },
	QItemLabel: { template: "<span><slot /></span>" },
	QIcon: true,
	QBadge: true,
	QExpansionItem: { template: "<div><slot name='header' /><slot /></div>" }
};

describe("AppDrawerItem", () => {
	it("keeps only exact stage context target active", async () => {
		const router = createRouter({
			history: createMemoryHistory(),
			routes: [
				{
					path: "/apps/:appName/stages/:stageName",
					component: { template: "" }
				},
				{
					path: "/apps/:appName/stages/:stageName/functions",
					component: { template: "" }
				}
			]
		});
		await router.push("/apps/console/stages/dev");
		await router.isReady();

		const overview = mount(AppDrawerItem, {
			props: {
				item: {
					label: "Overview",
					to: "/apps/console/stages/dev",
					exact: true
				}
			},
			global: { directives: { ripple: {} }, plugins: [router], stubs }
		});
		const functions = mount(AppDrawerItem, {
			props: {
				item: {
					label: "Functions",
					to: "/apps/console/stages/dev/functions",
					exact: true
				}
			},
			global: { directives: { ripple: {} }, plugins: [router], stubs }
		});

		expect(
			overview.get("[data-drawer-item]").attributes("data-active")
		).toBe("true");
		expect(
			functions.get("[data-drawer-item]").attributes("data-active")
		).toBe("false");
		expect(functions.get("[data-drawer-item]").attributes("data-to")).toBe(
			"/apps/console/stages/dev/functions"
		);

		await router.push("/apps/console/stages/dev/functions");

		expect(
			overview.get("[data-drawer-item]").attributes("data-active")
		).toBe("false");
		expect(
			functions.get("[data-drawer-item]").attributes("data-active")
		).toBe("true");
	});
});
