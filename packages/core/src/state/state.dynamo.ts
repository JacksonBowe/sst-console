import { Entity } from "electrodb";

const model = {
	service: "sstConsole",
	version: "1"
} as const;

export const stateSnapshotEntity = new Entity({
	model: { ...model, entity: "stateSnapshot" },
	attributes: {
		accountId: { type: "string", required: true },
		appName: { type: "string", required: true },
		stageName: { type: "string", required: true },
		snapshotId: { type: "string", required: true },
		reverseTimestamp: { type: "string", required: true },
		sourceBucket: { type: "string", required: true },
		sourceKey: { type: "string", required: true },
		sourceVersion: { type: "string" },
		archiveKey: { type: "string" },
		createdAt: { type: "string", required: true },
		schemaVersion: { type: "string", default: "1" }
	},
	indexes: {
		snapshot: {
			pk: {
				field: "pk",
				composite: ["accountId", "appName", "stageName"],
				template:
					"ACCOUNT#${accountId}#APP#${appName}#STAGE#${stageName}",
				casing: "none"
			},
			sk: {
				field: "sk",
				composite: ["reverseTimestamp", "snapshotId"],
				template: "SNAPSHOT#${reverseTimestamp}#${snapshotId}",
				casing: "none"
			}
		}
	}
});

export const syncRunEntity = new Entity({
	model: { ...model, entity: "syncRun" },
	attributes: {
		accountId: { type: "string", required: true },
		syncRunId: { type: "string", required: true },
		reverseTimestamp: { type: "string", required: true },
		status: { type: ["succeeded", "failed"] as const, required: true },
		startedAt: { type: "string", required: true },
		completedAt: { type: "string" },
		stateCount: { type: "number" },
		message: { type: "string" },
		schemaVersion: { type: "string", default: "1" }
	},
	indexes: {
		syncRun: {
			pk: {
				field: "pk",
				composite: ["accountId"],
				template: "ACCOUNT#${accountId}",
				casing: "none"
			},
			sk: {
				field: "sk",
				composite: ["reverseTimestamp", "syncRunId"],
				template: "SYNC#${reverseTimestamp}#${syncRunId}",
				casing: "none"
			}
		}
	}
});
