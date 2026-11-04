import { Entity } from "electrodb";

const model = {
	service: "sstConsole",
	version: "1"
} as const;

// One mutable source locator for a Stage's current app/ object. It intentionally
// contains no checkpoint data; S3 remains authoritative for raw SST State.
export const stateEntity = new Entity({
	model: { ...model, entity: "state" },
	attributes: {
		accountId: { type: "string", required: true },
		appName: { type: "string", required: true },
		stageName: { type: "string", required: true },
		sourceBucket: { type: "string", required: true },
		sourceKey: { type: "string", required: true },
		sourceVersion: { type: "string" },
		observedAt: { type: "string", required: true },
		schemaVersion: { type: "string", default: "3" }
	},
	indexes: {
		state: {
			pk: {
				field: "pk",
				composite: ["appName", "stageName"],
				template: "APP#${appName}#STAGE#${stageName}",
				casing: "none"
			},
			sk: {
				field: "sk",
				composite: [],
				template: "STATE",
				casing: "none"
			}
		}
	}
});

// One Console-safe update summary. `history` is a sparse Stage-local index so
// future history screens can page newest-first without scanning ConsoleData.
export const stateUpdateEntity = new Entity({
	model: { ...model, entity: "stateUpdate" },
	attributes: {
		accountId: { type: "string", required: true },
		appName: { type: "string", required: true },
		stageName: { type: "string", required: true },
		updateId: { type: "string", required: true },
		sourceBucket: { type: "string", required: true },
		sourceKey: { type: "string", required: true },
		sourceVersion: { type: "string" },
		sequencer: { type: "string" },
		observedAt: { type: "string", required: true },
		sstVersion: { type: "string", required: true },
		command: { type: "string", required: true },
		timeStarted: { type: "string" },
		timeCompleted: { type: "string" },
		errors: { type: "any", required: true },
		errorsSourceCount: { type: "number", required: true },
		errorsStoredCount: { type: "number", required: true },
		errorsTruncated: { type: "boolean", required: true },
		createdCount: { type: "number" },
		updatedCount: { type: "number" },
		deletedCount: { type: "number" },
		unchangedCount: { type: "number" },
		reverseHistoryAt: { type: "string", required: true },
		createdAt: { type: "string", required: true },
		schemaVersion: { type: "string", default: "1" }
	},
	indexes: {
		update: {
			pk: {
				field: "pk",
				composite: ["appName", "stageName"],
				template: "APP#${appName}#STAGE#${stageName}",
				casing: "none"
			},
			sk: {
				field: "sk",
				composite: ["updateId"],
				template: "STATE_UPDATE#${updateId}",
				casing: "none"
			}
		},
		history: {
			index: "lookup",
			pk: {
				field: "lookupPk",
				composite: ["appName", "stageName"],
				template: "STATE_UPDATE#${appName}#${stageName}",
				casing: "none"
			},
			sk: {
				field: "lookupSk",
				composite: ["reverseHistoryAt", "updateId"],
				template: "STATE_UPDATE#${reverseHistoryAt}#${updateId}",
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
		},
		byType: {
			index: "entitiesByType",
			pk: {
				field: "entityType",
				composite: [],
				template: "DISCOVERED_STAGE",
				casing: "none"
			},
			sk: {
				field: "entitySort",
				composite: ["accountId", "appName", "stageName"],
				template:
					"ACCOUNT#${accountId}#APP#${appName}#STAGE#${stageName}",
				casing: "none"
			}
		},
		byAwsAccount: {
			index: "entitiesByAwsAccount",
			pk: {
				field: "accountPk",
				composite: ["accountId"],
				template: "ACCOUNT#${accountId}",
				casing: "none"
			},
			sk: {
				field: "accountSk",
				composite: ["appName", "stageName"],
				template: "DISCOVERY#${appName}#${stageName}",
				casing: "none"
			}
		}
	}
});
