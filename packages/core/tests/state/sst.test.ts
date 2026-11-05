import { gzipSync } from "node:zlib";

import { describe, expect, it, vi } from "vitest";
import type { S3Client } from "@aws-sdk/client-s3";

import fixture from "./fixtures/sst-v4-bucket-state.json" with { type: "json" };
import {
	decodeSstStateBytes,
	fetchState,
	normalizeSstState,
	parseSstState,
	redactSstState
} from "../../src/state/sst";

describe("SST state", () => {
	it("fetches and decodes current State with its source version", async () => {
		const send = vi.fn().mockResolvedValue({
			ContentEncoding: "gzip",
			VersionId: "version-1",
			Body: {
				transformToByteArray: async () =>
					gzipSync(JSON.stringify(fixture))
			}
		});
		const result = await fetchState(
			{ send } as unknown as S3Client,
			"bucket",
			"app/shop/prod.json"
		);
		expect(result.state.checkpoint.latest.resources).toHaveLength(17);
		expect(result.sourceVersion).toBe("version-1");
		expect(send.mock.calls[0]![0].input).toEqual({
			Bucket: "bucket",
			Key: "app/shop/prod.json"
		});
	});

	it("rejects an empty State object", async () => {
		const s3 = {
			send: vi.fn().mockResolvedValue({})
		} as unknown as S3Client;
		await expect(fetchState(s3, "bucket", "key")).rejects.toMatchObject({
			code: "state.empty"
		});
	});

	it("parses an SST v4 Pulumi checkpoint", () => {
		const parsed = parseSstState(JSON.stringify(fixture));
		expect(parsed.checkpoint.latest.resources).toHaveLength(17);
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
			17
		);
	});

	it("redacts sensitive values before normalization", () => {
		const redacted = JSON.stringify(redactSstState(fixture));
		expect(redacted).not.toContain("plaintext-must-not-persist");
		expect(redacted).toContain("[REDACTED]");
	});

	it("normalizes supported components, not their Pulumi children", () => {
		const normalized = normalizeSstState(
			parseSstState(JSON.stringify(fixture))
		);
		expect(normalized.resources).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					resourceType: "sst.aws.Bucket",
					name: "Uploads",
					urn: "urn:pulumi:prod::console::sst:aws:Bucket::Uploads",
					normalizedArn: "arn:aws:s3:::console-prod-uploads-abc123",
					summary: { bucketName: "console-prod-uploads-abc123" }
				}),
				expect.objectContaining({
					resourceType: "sst.aws.Function",
					name: "Api",
					normalizedArn:
						"arn:aws:lambda:ap-southeast-2:123456789012:function:console-prod-api",
					summary: {
						functionName: "console-prod-api",
						runtime: "nodejs22.x",
						memorySize: 512,
						timeout: 30
					}
				}),
				expect.objectContaining({
					resourceType: "sst.aws.Dynamo",
					name: "Users",
					normalizedArn:
						"arn:aws:dynamodb:ap-southeast-2:123456789012:table/console-prod-users",
					summary: {
						tableName: "console-prod-users",
						billingMode: "PAY_PER_REQUEST",
						streamEnabled: false
					}
				}),
				expect.objectContaining({
					resourceKind: "component",
					resourceType: "sst.aws.Realtime",
					name: "Realtime"
				})
			])
		);
		expect(normalized.resources).toHaveLength(9);
		const realtime = normalized.resources.find(
			resource => resource.name === "Realtime"
		);
		const api = normalized.resources.find(
			resource => resource.name === "Api"
		);
		const bus = normalized.resources.find(
			resource => resource.name === "Events"
		);
		const realtimeSubscriber = normalized.resources.find(
			resource => resource.name === "RealtimeSubscriber"
		);
		const busSubscriber = normalized.resources.find(
			resource => resource.name === "EventsSubscriber"
		);
		const bucketNotification = normalized.resources.find(
			resource => resource.name === "UploadsNotifications"
		);
		const externalSubscriber = normalized.resources.find(
			resource => resource.name === "ExternalSubscriber"
		);
		const bucket = normalized.resources.find(
			resource => resource.name === "Uploads"
		);
		expect(realtime?.resourceId).toMatch(/^[a-f0-9]{64}$/);
		expect(api?.parentResourceId).toBe(realtime?.resourceId);
		expect(realtimeSubscriber?.parentResourceId).toBe(realtime?.resourceId);
		expect(busSubscriber?.parentResourceId).toBe(bus?.resourceId);
		expect(bucketNotification?.parentResourceId).toBe(bucket?.resourceId);
		expect(externalSubscriber?.parentResourceId).toBeUndefined();
	});
});
