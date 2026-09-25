import { gzipSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import fixture from "./fixtures/sst-v4-bucket-state.json" with { type: "json" };
import {
	decodeSstStateBytes,
	normalizeSstState,
	parseSstState,
	redactSstState
} from "./sst";

describe("SST state", () => {
	it("parses an SST v4 Pulumi checkpoint", () => {
		const parsed = parseSstState(JSON.stringify(fixture));
		expect(parsed.checkpoint.latest.resources).toHaveLength(3);
	});

	it("rejects unsupported checkpoints", () => {
		expect(() => parseSstState('{"version":2}')).toThrow(
			"supported Pulumi checkpoint"
		);
	});

	it("parses a decompressed gzip payload", () => {
		const bytes = new Uint8Array(gzipSync(JSON.stringify(fixture)));
		const decoded = decodeSstStateBytes(bytes, "gzip");
		expect(parseSstState(decoded).checkpoint.latest.resources).toHaveLength(
			3
		);
	});

	it("redacts sensitive values before normalization", () => {
		const redacted = JSON.stringify(redactSstState(fixture));
		expect(redacted).not.toContain("plaintext-must-not-persist");
		expect(redacted).toContain("[REDACTED]");
	});

	it("normalizes one bucket component, not its child", () => {
		const normalized = normalizeSstState(
			parseSstState(JSON.stringify(fixture))
		);
		expect(normalized.resources).toEqual([
			expect.objectContaining({
				resourceType: "sst.aws.Bucket",
				name: "Uploads",
				urn: "urn:pulumi:prod::console::sst:aws:Bucket::Uploads",
				normalizedArn: "arn:aws:s3:::console-prod-uploads-abc123",
				summary: { bucketName: "console-prod-uploads-abc123" }
			})
		]);
		expect(normalized.resources[0]?.resourceId).toMatch(/^[a-f0-9]{64}$/);
	});
});
