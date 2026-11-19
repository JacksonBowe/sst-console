import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ResourceDetails from "@/components/App/Detail/Stage/Resources/ResourceDetails.vue";

describe("ResourceDetails", () => {
	it("wraps long identifiers while retaining their copy values", () => {
		const resource = {
			accountId: "123456789012",
			appName: "app",
			stageName: "prod",
			resourceId: "long-resource-id".repeat(10),
			resourceKind: "resource" as const,
			resourceType: "sst.aws.Function",
			urn: "long-urn".repeat(10),
			normalizedArn: "arn:aws:lambda:region:account:function:long-name",
			name: "Function",
			children: [],
			createdAt: "2026-01-01",
			updatedAt: "2026-01-01"
		};
		const wrapper = mount(ResourceDetails, {
			props: { resource },
			global: {
				stubs: { QBtn: true, QIcon: true },
				mocks: { $q: { screen: { lt: { sm: false } } } }
			}
		});
		const values = wrapper.findAll(".copy-value--wrap");
		expect(
			values.map(value => value.find(".copy-value__text").text())
		).toEqual([
			resource.name,
			resource.resourceId,
			resource.normalizedArn,
			resource.urn
		]);
	});

	it.each([true, false])(
		"keeps an accessible AWS link at mobile=%s",
		mobile => {
			const arn =
				"arn:aws:lambda:ap-southeast-2:123456789012:function:api";
			const wrapper = mount(ResourceDetails, {
				props: {
					resource: {
						accountId: "123456789012",
						appName: "app",
						stageName: "prod",
						resourceId: "api",
						resourceKind: "component",
						resourceType: "sst.aws.Function",
						urn: "urn:api",
						normalizedArn: arn,
						name: "Api",
						children: [],
						createdAt: "2026-01-01",
						updatedAt: "2026-01-01"
					}
				},
				global: {
					stubs: { QBtn: true, QIcon: true },
					mocks: { $q: { screen: { lt: { sm: mobile } } } }
				}
			});
			const link = wrapper.get('[aria-label="Open in AWS Console"]');
			expect(link.attributes("href")).toBe(
				`https://console.aws.amazon.com/go/view?arn=${encodeURIComponent(arn)}`
			);
			expect(link.attributes("target")).toBe("_blank");
			expect(link.attributes("label")).toBe(
				mobile ? undefined : "Open in AWS Console"
			);
		}
	);
});
