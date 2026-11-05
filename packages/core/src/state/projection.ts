import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { db } from "../db";
import { stateErrors } from "./errors";
import {
	decodeSstStateBytes,
	normalizeSstState,
	parseSstState,
	type NormalizedResource
} from "./sst";
import { Resource } from "sst";
import { bus } from "sst/aws/bus";
import { Events } from "../app/events";
import { listByAccount } from "../app/app.stage";
import type { StateObject } from "./discovery";

export type StateProjection = StateObject & {
	resources: NormalizedResource[];
	sourceVersion?: string;
	sourceUpdatedAt: string;
};

/** Reads and normalizes one current SST State artifact. */
export async function loadProjection(
	s3: S3Client,
	bucket: string,
	state: StateObject
): Promise<StateProjection> {
	const object = await s3.send(
		new GetObjectCommand({ Bucket: bucket, Key: state.key })
	);
	if (!object.Body) {
		throw stateErrors.empty();
	}
	const bytes = await object.Body.transformToByteArray();
	const parsed = parseSstState(
		decodeSstStateBytes(bytes, object.ContentEncoding)
	);
	const sourceUpdatedAt =
		state.lastModified ??
		parsed.checkpoint.latest.manifest?.time ??
		new Date().toISOString();
	return {
		...state,
		resources: normalizeSstState(parsed).resources,
		sourceVersion: object.VersionId,
		sourceUpdatedAt
	};
}

/** Schedules removal after State has established that the projection is stale. */
export async function requestProjectionRemoval(input: {
	accountId: string;
	appName: string;
	stageName: string;
}) {
	await bus.publish(
		Resource.Bus,
		Events.StageProjectionRemovalRequested,
		input
	);
}

export async function removeDiscoveredStage(input: {
	accountId: string;
	appName: string;
	stageName: string;
}) {
	await db.entities.discoveredStage
		.delete({
			accountId: input.accountId,
			appName: input.appName,
			stageName: input.stageName
		})
		.go({ response: "none" });
}

/** Caller supplies the complete policy-selected list after all required syncs succeed. */
export async function cleanupStale(input: {
	accountId: string;
	stages: Array<{ appName: string; stageName: string }>;
}) {
	const desired = new Set(
		input.stages.map(stage => `${stage.appName}\u0000${stage.stageName}`)
	);
	const existing = await listByAccount({ accountId: input.accountId });
	for (const stage of existing) {
		if (!desired.has(`${stage.appName}\u0000${stage.stageName}`))
			await requestProjectionRemoval({
				accountId: input.accountId,
				appName: stage.appName,
				stageName: stage.stageName
			});
	}
}
