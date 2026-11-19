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
			global: { stubs: { QBtn: true, QIcon: true } }
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
});
