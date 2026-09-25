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
	arnIndex: string;
	parentResourceId?: string;
	resourceKind: "component" | "physical";
	resourceType: string;
	urn: string;
	normalizedArn?: string;
	name: string;
	summary:
		| { bucketName: string }
		| {
				functionName: string;
				runtime?: string;
				memorySize?: number;
				timeout?: number;
		  }
		| {
				tableName: string;
				billingMode?: string;
				streamEnabled?: boolean;
		  }
		| undefined;
};

export type NormalizedState = {
	resources: NormalizedResource[];
};

// SST now stores state objects compressed by default. S3 tells us when to
// decompress through Content-Encoding; callers then pass plain JSON to parser.
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

// State must never reach ConsoleData unfiltered. Pulumi's secret envelope and
// conventional sensitive property names both become an irreversible marker.
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

	return {
		resources: resources.flatMap(component =>
			normalizeResource(component, resources)
		)
	};
}

// An SST component is Console's identity. Physical components use their owned
// Pulumi child for AWS fields; other SST components become tree group rows.
function normalizeResource(
	component: SstState["checkpoint"]["latest"]["resources"][number],
	resources: SstState["checkpoint"]["latest"]["resources"]
): NormalizedResource[] {
	const parentResourceId = parentIdFor(component.parent, resources);
	if (component.type === "sst:aws:Bucket") {
		const child = findChild(
			component.urn,
			"aws:s3/bucket:Bucket",
			resources
		);
		const arn = firstString(component.outputs.arn, child?.outputs.arn);
		const bucketName = firstString(
			component.outputs.name,
			component.outputs.bucket,
			child?.outputs.bucket
		);
		if (!arn || !bucketName || !arn.startsWith("arn:")) return [];
		return [
			baseResource(
				component,
				"sst.aws.Bucket",
				arn,
				{ bucketName },
				parentResourceId
			)
		];
	}

	if (component.type === "sst:aws:Function") {
		const child = findChild(
			component.urn,
			"aws:lambda/function:Function",
			resources
		);
		const arn = firstString(component.outputs.arn, child?.outputs.arn);
		const functionName = firstString(
			component.outputs.name,
			child?.outputs.name
		);
		if (!arn || !functionName || !arn.startsWith("arn:")) return [];
		return [
			baseResource(
				component,
				"sst.aws.Function",
				arn,
				{
					functionName,
					runtime: optionalString(child?.outputs.runtime),
					memorySize: optionalNumber(child?.outputs.memorySize),
					timeout: optionalNumber(child?.outputs.timeout)
				},
				parentResourceId
			)
		];
	}

	if (component.type === "sst:aws:Dynamo") {
		const child = findChild(
			component.urn,
			"aws:dynamodb/table:Table",
			resources
		);
		const arn = firstString(component.outputs.arn, child?.outputs.arn);
		const tableName = firstString(
			component.outputs.name,
			child?.outputs.name
		);
		if (!arn || !tableName || !arn.startsWith("arn:")) return [];
		return [
			baseResource(
				component,
				"sst.aws.Dynamo",
				arn,
				{
					tableName,
					billingMode: optionalString(child?.outputs.billingMode),
					streamEnabled: optionalBoolean(child?.outputs.streamEnabled)
				},
				parentResourceId
			)
		];
	}

	if (!component.type.startsWith("sst:aws:")) return [];
	return [
		{
			resourceId: resourceIdFor(component.urn),
			parentResourceId,
			resourceKind: "component",
			resourceType: component.type.replaceAll(":", "."),
			urn: component.urn,
			arnIndex: `component#${resourceIdFor(component.urn)}`,
			name: nameFromUrn(component.urn),
			summary: undefined
		}
	];
}

function findChild(
	parent: string,
	type: string,
	resources: SstState["checkpoint"]["latest"]["resources"]
) {
	return resources.find(
		resource => resource.parent === parent && resource.type === type
	);
}

function baseResource(
	component: SstState["checkpoint"]["latest"]["resources"][number],
	resourceType: NormalizedResource["resourceType"],
	arn: string,
	summary: NormalizedResource["summary"],
	parentResourceId?: string
): NormalizedResource {
	return {
		resourceId: resourceIdFor(component.urn),
		parentResourceId,
		resourceKind: "physical",
		resourceType,
		urn: component.urn,
		normalizedArn: arn.trim(),
		arnIndex: arn.trim(),
		name: nameFromUrn(component.urn),
		summary
	};
}

function parentIdFor(
	parentUrn: string | undefined,
	resources: SstState["checkpoint"]["latest"]["resources"]
): string | undefined {
	const parent = resources.find(resource => resource.urn === parentUrn);
	return parent?.type.startsWith("sst:aws:")
		? resourceIdFor(parent.urn)
		: undefined;
}

function resourceIdFor(urn: string): string {
	return createHash("sha256").update(urn).digest("hex");
}

function firstString(...values: unknown[]): string | undefined {
	return values.find(
		value => typeof value === "string" && value.length > 0
	) as string | undefined;
}

function optionalString(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
	return typeof value === "number" ? value : undefined;
}

function optionalBoolean(value: unknown): boolean | undefined {
	return typeof value === "boolean" ? value : undefined;
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
