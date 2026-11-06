import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { GetParameterCommand, type SSMClient } from "@aws-sdk/client-ssm";
import { GetObjectCommand, type S3Client } from "@aws-sdk/client-s3";

import { z } from "zod";
import { stateErrors } from "./errors";

/** Reads SST bootstrap metadata; callers decide how to handle an empty value. */
export async function getBootstrapBucket(
	ssm: SSMClient
): Promise<string | undefined> {
	const parameter = await ssm.send(
		new GetParameterCommand({ Name: "/sst/bootstrap" })
	);
	if (!parameter.Parameter?.Value) return;
	const bootstrap = z
		.object({ state: z.string().min(1) })
		.safeParse(JSON.parse(parameter.Parameter.Value));
	if (!bootstrap.success) throw stateErrors.invalidBootstrap();
	return bootstrap.data.state;
}

/** Fetches and parses current State from a workload's SST bucket. */
export async function fetchState(s3: S3Client, bucket: string, key: string) {
	const object = await s3.send(
		new GetObjectCommand({ Bucket: bucket, Key: key })
	);
	if (!object.Body) throw stateErrors.empty();
	const bytes = await object.Body.transformToByteArray();
	return {
		state: parseSstState(
			decodeSstStateBytes(bytes, object.ContentEncoding)
		),
		sourceVersion: object.VersionId
	};
}

const pulumiSecretSignature = "4dabf18193072939515e22adb298388d";
const sensitiveKey =
	/(?:secret|password|passphrase|token|api[-_]?key|private[-_]?key|credential|authorization)/i;

const resourceSchema = z.object({
	urn: z.string().min(1),
	type: z.string().min(1),
	parent: z.string().optional(),
	custom: z.boolean().optional(),
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
/** Decompresses SST artifact bytes when S3 reports gzip encoding. */
export function decodeSstStateBytes(
	input: Uint8Array,
	contentEncoding?: string
): Uint8Array {
	if (contentEncoding?.toLowerCase().includes("gzip")) {
		return new Uint8Array(gunzipSync(input));
	}
	return input;
}

/** Parses and validates a supported SST State checkpoint. */
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

// TODO: Investigate this. How robust is it? If it's not robust, or relies on users building in a certain way then it may as well not exist and we should remove.
// State must never reach ConsoleData unfiltered. Pulumi's secret envelope and
// conventional sensitive property names both become an irreversible marker.
/** Recursively redacts Pulumi secrets and sensitive property values. */
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

/** Redacts a checkpoint and normalizes its resources for Console projections. */
export function normalizeSstState(state: SstState): NormalizedState {
	const redacted = redactSstState(state) as SstState;
	const resources = redacted.checkpoint.latest.resources;

	const projected = resources.flatMap(resource =>
		normalizeResource(resource, resources)
	);
	return { resources: projected };
}

// SST components retain their identity and selected AWS summaries. Other
// checkpoint resources contribute identity and hierarchy, never raw properties.
/** Converts a checkpoint entry into a safe Console resource projection. */
function normalizeResource(
	component: SstState["checkpoint"]["latest"]["resources"][number],
	resources: SstState["checkpoint"]["latest"]["resources"]
): NormalizedResource[] {
	const parentResourceId =
		semanticParentIdFor(component, resources) ??
		parentIdFor(component.parent, resources);
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
		if (!arn || !bucketName || !arn.startsWith("arn:"))
			return [componentResource(component, parentResourceId)];
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
		if (!arn || !functionName || !arn.startsWith("arn:"))
			return [componentResource(component, parentResourceId)];
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
		if (!arn || !tableName || !arn.startsWith("arn:"))
			return [componentResource(component, parentResourceId)];
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

	if (isStructuralResource(component.type)) return [];
	if (component.type.startsWith("sst:aws:"))
		return [componentResource(component, parentResourceId)];
	return [
		{
			resourceId: resourceIdFor(component.urn),
			parentResourceId,
			resourceKind: component.custom === false ? "component" : "physical",
			resourceType: component.type,
			urn: component.urn,
			name: nameFromUrn(component.urn),
			summary: undefined
		}
	];
}

function componentResource(
	component: SstState["checkpoint"]["latest"]["resources"][number],
	parentResourceId?: string
): NormalizedResource {
	return {
		resourceId: resourceIdFor(component.urn),
		parentResourceId,
		resourceKind: "component",
		resourceType: component.type.replaceAll(":", "."),
		urn: component.urn,
		name: nameFromUrn(component.urn),
		summary: undefined
	};
}

function isStructuralResource(type: string): boolean {
	return (
		type === "pulumi:pulumi:Stack" || type.startsWith("pulumi:providers:")
	);
}

/** Finds a Pulumi child by its parent URN and resource type. */
function findChild(
	parent: string,
	type: string,
	resources: SstState["checkpoint"]["latest"]["resources"]
) {
	return resources.find(
		resource => resource.parent === parent && resource.type === type
	);
}

/** Builds the common fields for a physical resource projection. */
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
		name: nameFromUrn(component.urn),
		summary
	};
}

/** Resolves a projected parent, treating the stack and providers as structural. */
function parentIdFor(
	parentUrn: string | undefined,
	resources: SstState["checkpoint"]["latest"]["resources"]
): string | undefined {
	const parent = resources.find(resource => resource.urn === parentUrn);
	return parent && !isStructuralResource(parent.type)
		? resourceIdFor(parent.urn)
		: undefined;
}

// SST creates subscription components beside their owners, rather than as
// Pulumi children. Their owned AWS resources identify the managed resource.
/** Resolves the projected owner of a subscription or subscriber component. */
function semanticParentIdFor(
	component: SstState["checkpoint"]["latest"]["resources"][number],
	resources: SstState["checkpoint"]["latest"]["resources"]
): string | undefined {
	if (component.type === "sst:aws:RealtimeLambdaSubscriber") {
		const subscriberName = nameFromUrn(component.urn);
		const owners = resources.filter(
			resource =>
				resource.type === "sst:aws:Realtime" &&
				subscriberName.startsWith(
					`${nameFromUrn(resource.urn)}Subscriber`
				)
		);
		const owner = owners.length === 1 ? owners[0] : undefined;
		return owner ? resourceIdFor(owner.urn) : undefined;
	}

	const owner = subscriptionOwner(component.type);
	if (!owner) return undefined;

	const subscription = findChild(
		component.urn,
		owner.subscriptionType,
		resources
	);
	const ownerName = optionalString(subscription?.inputs[owner.input]);
	if (!ownerName) return undefined;

	const parents = resources.filter(resource => {
		if (resource.type !== owner.type) return false;
		const child = findChild(resource.urn, owner.childType, resources);
		return (
			firstString(child?.outputs.name, child?.outputs.bucket) ===
			ownerName
		);
	});
	return parents.length === 1 ? resourceIdFor(parents[0]!.urn) : undefined;
}

/** Returns owner lookup rules for supported subscription component types. */
function subscriptionOwner(type: string):
	| {
			input: "eventBusName" | "bucket";
			type: string;
			childType: string;
			subscriptionType: string;
	  }
	| undefined {
	if (
		type === "sst:aws:BusLambdaSubscriber" ||
		type === "sst:aws:BusQueueSubscriber"
	) {
		return {
			input: "eventBusName",
			type: "sst:aws:Bus",
			childType: "aws:cloudwatch/eventBus:EventBus",
			subscriptionType: "aws:cloudwatch/eventRule:EventRule"
		};
	}
	if (
		type === "sst:aws:BucketLambdaSubscriber" ||
		type === "sst:aws:BucketQueueSubscriber" ||
		type === "sst:aws:BucketTopicSubscriber" ||
		type === "sst:aws:BucketNotification"
	) {
		return {
			input: "bucket",
			type: "sst:aws:Bucket",
			childType: "aws:s3/bucket:Bucket",
			subscriptionType: "aws:s3/bucketNotification:BucketNotification"
		};
	}
}

/** Derives a stable resource ID from its URN. */
function resourceIdFor(urn: string): string {
	return createHash("sha256").update(urn).digest("hex");
}

/** Returns the first nonempty string among the supplied values. */
function firstString(...values: unknown[]): string | undefined {
	return values.find(
		value => typeof value === "string" && value.length > 0
	) as string | undefined;
}

/** Returns the value when it is a string. */
function optionalString(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined;
}

/** Returns the value when it is a number. */
function optionalNumber(value: unknown): number | undefined {
	return typeof value === "number" ? value : undefined;
}

/** Returns the value when it is a boolean. */
function optionalBoolean(value: unknown): boolean | undefined {
	return typeof value === "boolean" ? value : undefined;
}

/** Identifies a Pulumi secret envelope. */
function isPulumiSecret(value: Record<string, unknown>): boolean {
	return (
		Object.keys(value).length === 1 &&
		Object.hasOwn(value, pulumiSecretSignature)
	);
}

/** Checks whether a value is a non-null object. */
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

/** Extracts the resource name from a Pulumi URN. */
function nameFromUrn(urn: string): string {
	return urn.split("::").at(-1) ?? urn;
}
