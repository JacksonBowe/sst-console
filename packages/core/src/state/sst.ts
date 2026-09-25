import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";

import { z } from "zod";

const pulumiSecretSignature = "4dabf18193072939515e22adb298388d";
const sensitiveKey =
	/(?:secret|password|passphrase|token|api[-_]?key|private[-_]?key|credential|authorization)/i;

const resourceSchema = z.object({
	urn: z.string().min(1),
	type: z.string().min(1),
	parent: z.string().optional(),
	inputs: z.record(z.string(), z.unknown()).default({}),
	outputs: z.record(z.string(), z.unknown()).default({})
});

const checkpointSchema = z.object({
	version: z.literal(3),
	checkpoint: z.object({
		latest: z.object({
			manifest: z.object({ time: z.string().optional() }).optional(),
			resources: z.array(resourceSchema).default([])
		})
	})
});

export type SstState = z.output<typeof checkpointSchema>;

export type NormalizedResource = {
	resourceId: string;
	resourceType: "sst.aws.Bucket";
	urn: string;
	normalizedArn: string;
	name: string;
	summary: { bucketName: string };
};

export type NormalizedState = {
	resources: NormalizedResource[];
};

export function decodeSstStateBytes(
	input: Uint8Array,
	contentEncoding?: string
): Uint8Array {
	if (contentEncoding?.toLowerCase().includes("gzip")) {
		return new Uint8Array(gunzipSync(input));
	}
	return input;
}

export function parseSstState(input: string | Uint8Array): SstState {
	const text =
		typeof input === "string" ? input : new TextDecoder().decode(input);
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch {
		throw new Error("SST state object is not valid JSON");
	}

	const parsed = checkpointSchema.safeParse(value);
	if (!parsed.success) {
		throw new Error(
			"SST state object is not a supported Pulumi checkpoint"
		);
	}
	return parsed.data;
}

export function redactSstState(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(redactSstState);
	if (!isRecord(value)) return value;
	if (isPulumiSecret(value)) return "[REDACTED]";

	return Object.fromEntries(
		Object.entries(value).map(([key, nested]) => [
			key,
			sensitiveKey.test(key) ? "[REDACTED]" : redactSstState(nested)
		])
	);
}

export function normalizeSstState(state: SstState): NormalizedState {
	const redacted = redactSstState(state) as SstState;
	const resources = redacted.checkpoint.latest.resources;
	const buckets = resources.filter(
		resource => resource.type === "sst:aws:Bucket"
	);

	return {
		resources: buckets.flatMap(component => {
			const child = resources.find(
				resource =>
					resource.parent === component.urn &&
					resource.type === "aws:s3:Bucket"
			);
			const arn = firstString(component.outputs.arn, child?.outputs.arn);
			const bucketName = firstString(
				component.outputs.name,
				component.outputs.bucket,
				child?.outputs.bucket
			);
			if (!arn || !bucketName || !arn.startsWith("arn:")) return [];

			return [
				{
					resourceId: createHash("sha256")
						.update(component.urn)
						.digest("hex"),
					resourceType: "sst.aws.Bucket",
					urn: component.urn,
					normalizedArn: arn.trim(),
					name: nameFromUrn(component.urn),
					summary: { bucketName }
				}
			];
		})
	};
}

function firstString(...values: unknown[]): string | undefined {
	return values.find(
		value => typeof value === "string" && value.length > 0
	) as string | undefined;
}

function isPulumiSecret(value: Record<string, unknown>): boolean {
	return (
		Object.keys(value).length === 1 &&
		Object.hasOwn(value, pulumiSecretSignature)
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function nameFromUrn(urn: string): string {
	return urn.split("::").at(-1) ?? urn;
}
