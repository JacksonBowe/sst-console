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
		schemaVersion: { type: "string", default: "2" }
	},
	indexes: {
		snapshot: {
			pk: {
				field: "pk",
				composite: ["appName", "stageName"],
				template: "APP#${appName}#STAGE#${stageName}",
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
		status: {
			type: ["succeeded", "completed_with_conflicts", "failed"] as const,
			required: true
		},
		startedAt: { type: "string", required: true },
		completedAt: { type: "string" },
		stateCount: { type: "number" },
		message: { type: "string" },
		conflicts: { type: "any" },
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

export const discoveredStageEntity = new Entity({
	model: { ...model, entity: "discoveredStage" },
	attributes: {
		accountId: { type: "string", required: true },
		appName: { type: "string", required: true },
		stageName: { type: "string", required: true },
		stateBucket: { type: "string", required: true },
		stateKey: { type: "string", required: true },
		lastModified: { type: "string" },
		size: { type: "number" },
		etag: { type: "string" },
		discoveredAt: { type: "string", required: true },
		schemaVersion: { type: "string", default: "1" }
	},
	indexes: {
		discovery: {
			pk: {
				field: "pk",
				composite: ["accountId"],
				template: "ACCOUNT#${accountId}",
				casing: "none"
			},
			sk: {
				field: "sk",
				composite: ["appName", "stageName"],
				template: "DISCOVERY#${appName}#STAGE#${stageName}",
				casing: "none"
			}
		}
	}
});
