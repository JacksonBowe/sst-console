import { mount } from "@vue/test-utils";
import { defineComponent } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LocalSessionControl from "@/components/Console/LocalSessionControl.vue";

const state = vi.hoisted(() => ({
	apps: [] as Array<{
		appName: string;
		stages: Array<{ stageName: string; region: string }>;
	}>,
	localSession: {
		permission: "granted",
		status: "connected",
		identity: undefined as
			| { app: string; stage: string; region?: string }
			| undefined
	},
	route: { name: "apps", params: {} as Record<string, string> }
}));

vi.mock("vue-router", () => ({
	useRoute: () => state.route
}));

vi.mock("@/composables/apps", () => ({
	useApps: () => ({ data: { value: state.apps } })
}));

vi.mock("@/stores/local-session", () => ({
	useLocalSessionStore: () => state.localSession
}));

const AppDrawerItem = defineComponent({
	props: { item: Object },
	template:
		'<button :data-route="item?.to" :data-badge="item?.badge"><slot /></button>'
});

describe("LocalSessionControl", () => {
	beforeEach(() => {
		state.localSession.permission = "granted";
		state.localSession.status = "connected";
		state.localSession.identity = {
			app: "console",
			stage: "dev",
			region: "us-east-1"
		};
		state.apps = [];
		state.route = { name: "apps", params: {} };
	});

	it("opens standalone workspace for an unconnected local session", () => {
		const wrapper = mount(LocalSessionControl, {
			global: { stubs: { AppDrawerItem, QBtn: true, QTooltip: true } }
		});

		expect(wrapper.get("button").attributes("data-route")).toBe("/local");
		expect(wrapper.get("button").attributes("data-badge")).toBe("");
	});

	it("opens contextual workspace for a connected stage", () => {
		state.apps = [
			{
				appName: "console",
				stages: [{ stageName: "dev", region: "us-east-1" }]
			}
		];
		const wrapper = mount(LocalSessionControl, {
			global: { stubs: { AppDrawerItem, QBtn: true, QTooltip: true } }
		});

		expect(wrapper.get("button").attributes("data-route")).toBe(
			"/apps/console/stages/dev/local"
		);
	});

	it("hides the footer entry on the matching stage route", () => {
		state.route = {
			name: "stage-detail",
			params: { appName: "console", stageName: "dev" }
		};
		const wrapper = mount(LocalSessionControl, {
			global: { stubs: { AppDrawerItem, QBtn: true, QTooltip: true } }
		});

		expect(wrapper.find("button").exists()).toBe(false);
	});
});
