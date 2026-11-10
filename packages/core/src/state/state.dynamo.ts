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
		},
		byType: {
			index: "entitiesByType",
			pk: {
				field: "entityType",
				composite: [],
				template: "STATE",
				casing: "none"
			},
			sk: {
				field: "entitySort",
				composite: ["appName", "stageName"],
				template: "APP#${appName}#STAGE#${stageName}",
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
		sstVersion: { type: "string" },
		command: { type: "string" },
		timeStarted: { type: "string" },
		timeCompleted: { type: "string" },
		errors: { type: "any" },
		errorsSourceCount: { type: "number" },
		errorsStoredCount: { type: "number" },
		errorsTruncated: { type: "boolean" },
		processedAt: { type: "string" },
		comparisonStatus: { type: ["available", "unavailable"] as const },
		resourceCounts: { type: "any" },
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
		byType: {
			index: "entitiesByType",
			pk: {
				field: "entityType",
				composite: [],
				template: "STATE_UPDATE",
				casing: "none"
			},
			sk: {
				field: "entitySort",
				composite: ["appName", "stageName", "updateId"],
				template:
					"APP#${appName}#STAGE#${stageName}#STATE_UPDATE#${updateId}",
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
				composite: ["updateId"],
				template: "STATE_UPDATE#${updateId}",
				casing: "none"
			}
		}
	}
});

// Snapshot and Event Log records are independent of Update arrival order.
export const stateSnapshotEntity = new Entity({
	model: { ...model, entity: "stateSnapshot" },
	attributes: {
		accountId: { type: "string", required: true },
		appName: { type: "string", required: true },
		stageName: { type: "string", required: true },
		updateId: { type: "string", required: true },
		sourceBucket: { type: "string", required: true },
		sourceKey: { type: "string", required: true },
		sourceVersion: { type: "string" },
		lastModified: { type: "string", required: true },
		observedAt: { type: "string", required: true },
		processedAt: { type: "string" },
		schemaVersion: { type: "string", default: "3" }
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
				composite: ["updateId"],
				template: "STATE_SNAPSHOT#${updateId}",
				casing: "none"
			}
		},
		byType: {
			index: "entitiesByType",
			pk: {
				field: "entityType",
				composite: [],
				template: "STATE_SNAPSHOT",
				casing: "none"
			},
			sk: {
				field: "entitySort",
				composite: ["appName", "stageName", "updateId"],
				template:
					"APP#${appName}#STAGE#${stageName}#STATE_SNAPSHOT#${updateId}",
				casing: "none"
			}
		}
	}
});

export const stateEventEntity = new Entity({
	model: { ...model, entity: "stateEvent" },
	attributes: {
		appName: { type: "string", required: true },
		stageName: { type: "string", required: true },
		updateId: { type: "string", required: true },
		resourceId: { type: "string", required: true },
		action: {
			type: ["created", "updated", "deleted"] as const,
			required: true
		},
		urn: { type: "string", required: true },
		resourceType: { type: "string", required: true },
		parentUrn: { type: "string" },
		custom: { type: "boolean" },
		snapshot: { type: "any" },
		operation: { type: "any" }
	},
	indexes: {
		event: {
			pk: {
				field: "pk",
				composite: ["appName", "stageName"],
				template: "APP#${appName}#STAGE#${stageName}",
				casing: "none"
			},
			sk: {
				field: "sk",
				composite: ["updateId", "resourceId", "action"],
				template: "STATE_EVENT#${updateId}#${resourceId}#${action}",
				casing: "none"
			}
		},
		byType: {
			index: "entitiesByType",
			pk: {
				field: "entityType",
				composite: [],
				template: "STATE_EVENT",
				casing: "none"
			},
			sk: {
				field: "entitySort",
				composite: [
					"appName",
					"stageName",
					"updateId",
					"resourceId",
					"action"
				],
				template:
					"APP#${appName}#STAGE#${stageName}#STATE_EVENT#${updateId}#${resourceId}#${action}",
				casing: "none"
			}
		}
	}
});

export const stateEventLogEntity = new Entity({
	model: { ...model, entity: "stateEventLog" },
	attributes: {
		accountId: { type: "string", required: true },
		appName: { type: "string", required: true },
		stageName: { type: "string", required: true },
		updateId: { type: "string", required: true },
		sourceBucket: { type: "string", required: true },
		sourceKey: { type: "string", required: true },
		sourceVersion: { type: "string" },
		lastModified: { type: "string", required: true },
		observedAt: { type: "string", required: true },
		processedAt: { type: "string" },
		schemaVersion: { type: "string", default: "1" }
	},
	indexes: {
		eventLog: {
			pk: {
				field: "pk",
				composite: ["appName", "stageName"],
				template: "APP#${appName}#STAGE#${stageName}",
				casing: "none"
			},
			sk: {
				field: "sk",
				composite: ["updateId"],
				template: "STATE_EVENT_LOG#${updateId}",
				casing: "none"
			}
		},
		byType: {
			index: "entitiesByType",
			pk: {
				field: "entityType",
				composite: [],
				template: "STATE_EVENT_LOG",
				casing: "none"
			},
			sk: {
				field: "entitySort",
				composite: ["appName", "stageName", "updateId"],
				template:
					"APP#${appName}#STAGE#${stageName}#STATE_EVENT_LOG#${updateId}",
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
