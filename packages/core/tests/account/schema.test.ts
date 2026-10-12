import { describe, expect, it } from "vitest";

import { ConnectorSchema } from "../../src/account/schema";

describe("ConnectorSchema", () => {
	it("accepts control-account and stage-scoped connector roles", () => {
		expect(
			ConnectorSchema.safeParse({
				region: "ap-southeast-2",
				roleArn:
					"arn:aws:iam::123456789012:role/SSTConsoleRole-123456789012-ef260e9aa3c673af"
			}).success
		).toBe(true);
	});

	it("rejects legacy static connector roles", () => {
		expect(
			ConnectorSchema.safeParse({
				region: "ap-southeast-2",
				roleArn: "arn:aws:iam::123456789012:role/SSTConsoleRole"
			}).success
		).toBe(false);
	});
});
