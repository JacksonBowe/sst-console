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

	it("normalizes components and their Pulumi children", () => {
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
		expect(normalized.resources).toHaveLength(16);
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
		expect(
			normalized.resources.find(
				resource => resource.name === "UploadsBucket"
			)?.parentResourceId
		).toBe(bucket?.resourceId);
	});

	it("projects provider-neutral resources while hiding stack and providers", () => {
		const stack = "urn:pulumi:prod::app::pulumi:pulumi:Stack::app";
		const bucket = "urn:pulumi:prod::app::sst:aws:Bucket::Bucket";
		const resource = (
			urn: string,
			type: string,
			parent?: string,
			custom?: boolean
		) => ({ urn, type, parent, custom });
		const state = parseSstState(
			JSON.stringify({
				version: 3,
				checkpoint: {
					latest: {
						resources: [
							resource(stack, "pulumi:pulumi:Stack"),
							resource(
								"urn:provider",
								"pulumi:providers:neon",
								undefined,
								true
							),
							resource(bucket, "sst:aws:Bucket", stack, false),
							resource(
								"urn:bucket-child",
								"aws:s3/bucket:Bucket",
								bucket,
								true
							),
							resource(
								"urn:policy",
								"aws:s3/bucketPolicy:BucketPolicy",
								bucket,
								true
							),
							resource(
								"urn:queue",
								"aws:sqs/queue:Queue",
								stack,
								true
							),
							resource(
								"urn:neon",
								"neon:index/branch:Branch",
								stack,
								true
							),
							resource(
								"urn:component",
								"example:index:Component",
								stack,
								false
							),
							resource(
								"urn:nested",
								"stripe:index/product:Product",
								"urn:component",
								true
							)
						]
					}
				}
			})
		);
		const result = normalizeSstState(state).resources;
		expect(result).toHaveLength(7);
		const parent = result.find(item => item.urn === bucket)!;
		expect(parent.resourceKind).toBe("component");
		expect(
			result.find(item => item.urn === "urn:policy")?.parentResourceId
		).toBe(parent.resourceId);
		expect(
			result.find(item => item.urn === "urn:neon")?.parentResourceId
		).toBeUndefined();
		expect(
			result.find(item => item.urn === "urn:component")?.resourceKind
		).toBe("component");
		expect(
			result.find(item => item.urn === "urn:nested")?.parentResourceId
		).toBe(result.find(item => item.urn === "urn:component")?.resourceId);
	});

	it("does not infer an owner when Realtime names match multiple components", () => {
		const resources = [
			{
				urn: "urn:pulumi:prod::app::sst:aws:Realtime::Chat",
				type: "sst:aws:Realtime"
			},
			{
				urn: "urn:pulumi:prod::app::sst:aws:Realtime::ChatSubscriber",
				type: "sst:aws:Realtime"
			},
			{
				urn: "urn:pulumi:prod::app::sst:aws:RealtimeLambdaSubscriber::ChatSubscriberSubscriber",
				type: "sst:aws:RealtimeLambdaSubscriber"
			}
		];
		const state = parseSstState(
			JSON.stringify({
				version: 3,
				checkpoint: { latest: { resources } }
			})
		);
		const subscriber = normalizeSstState(state).resources.find(
			item => item.resourceType === "sst.aws.RealtimeLambdaSubscriber"
		);
		expect(subscriber?.parentResourceId).toBeUndefined();
	});
});
