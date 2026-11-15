import { Resource } from "sst";
import { bus } from "sst/aws/bus";
import { Events } from "../app/events";
import { listByAccount } from "../app/app.stage";
import { stageKey } from "./keys";

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

/** Schedules stale cleanup after discovery and all required syncs succeed. */
export async function cleanupStale(input: {
	accountId: string;
	stages: Array<{ appName: string; stageName: string }>;
}) {
	const desired = new Set(
		input.stages.map(stage => stageKey(stage.appName, stage.stageName))
	);
	const existing = await listByAccount({ accountId: input.accountId });
	for (const stage of existing) {
		if (!desired.has(stageKey(stage.appName, stage.stageName)))
			await requestProjectionRemoval({
				accountId: input.accountId,
				appName: stage.appName,
				stageName: stage.stageName
			});
	}
}
