import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import IssueMetrics from "@/components/Monitoring/Issues/IssueMetrics.vue";

describe("IssueMetrics", () => {
	it("renders each metric with its icon, value and full label", () => {
		const metrics = [
			{ label: "Open issues", value: 42, icon: "sym_r_warning" },
			{
				label: "Open occurrences",
				value: 123456789012,
				icon: "sym_r_monitoring"
			},
			{
				label: "Monitored stages (global)",
				value: "—",
				icon: "sym_r_layers"
			}
		];
		const wrapper = mount(IssueMetrics, {
			props: { metrics },
			global: {
				mocks: { $q: { screen: { lt: { sm: false } } } },
				stubs: {
					QCard: { template: "<article><slot /></article>" },
					QIcon: {
						props: ["name"],
						template: '<i :data-icon="name" />'
					}
				}
			}
		});

		const cards = wrapper.findAll("article");
		expect(cards).toHaveLength(metrics.length);
		for (const [index, metric] of metrics.entries()) {
			const card = cards[index]!;
			expect(card.get("i").attributes("data-icon")).toBe(metric.icon);
			expect(card.get(".text-h6").text()).toBe(String(metric.value));
			expect(card.get(".text-caption").text()).toBe(metric.label);
		}
	});

	it("places the mobile value alongside its icon and label below", () => {
		const wrapper = mount(IssueMetrics, {
			props: {
				metrics: [
					{
						label: "Monitored stages (global)",
						value: 123,
						icon: "layers"
					}
				]
			},
			global: {
				mocks: { $q: { screen: { lt: { sm: true } } } },
				stubs: {
					QCard: { template: "<article><slot /></article>" },
					QIcon: { template: "<i />" }
				}
			}
		});

		const card = wrapper.get("article");
		expect(card.get(".row").find("i").exists()).toBe(true);
		expect(card.get(".row .text-h6").text()).toBe("123");
		expect(card.get(".text-caption").text()).toBe(
			"Monitored stages (global)"
		);
	});

	it.each([true, false])(
		"uses concise labels on mobile=%s while preserving the full name",
		mobile => {
			const wrapper = mount(IssueMetrics, {
				props: {
					metrics: [
						{
							label: "Monitored stages (global)",
							mobileLabel: "Stages (global)",
							value: 2,
							icon: "layers"
						}
					]
				},
				global: {
					mocks: { $q: { screen: { lt: { sm: mobile } } } },
					stubs: {
						QCard: { template: "<div><slot /></div>" },
						QIcon: true
					}
				}
			});
			expect(wrapper.get('[role="group"]').attributes("aria-label")).toBe(
				"Monitored stages (global)"
			);
			expect(wrapper.get(".text-caption").text()).toBe(
				mobile ? "Stages (global)" : "Monitored stages (global)"
			);
		}
	);
});
