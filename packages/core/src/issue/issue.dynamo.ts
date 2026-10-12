import { Entity } from "electrodb";

const model = {
	service: "sstConsole",
	version: "1"
} as const;

export const issueSubscriberEntity = new Entity({
	model: { ...model, entity: "issueSubscriber" },
	attributes: {
		accountId: { type: "string", required: true },
		region: { type: "string", required: true },
		stackName: { type: "string", required: true },
		status: {
			type: ["pending", "ready", "failed"] as const,
			required: true
		},
		functionArn: { type: "string" },
		lastError: { type: "string" },
		updatedAt: { type: "string", required: true },
		schemaVersion: { type: "string", default: "1" }
	},
	indexes: {
		subscriber: {
			pk: {
				field: "pk",
				composite: ["accountId", "region"],
				template: "ISSUE_SUBSCRIBER#${accountId}#${region}",
				casing: "none"
			},
			sk: {
				field: "sk",
				composite: [],
				template: "SUBSCRIBER",
				casing: "none"
			}
		},
		byType: {
			index: "entitiesByType",
			pk: {
				field: "entityType",
				composite: [],
				template: "ISSUE_SUBSCRIBER",
				casing: "none"
			},
			sk: {
				field: "entitySort",
				composite: ["accountId", "region"],
				template: "ACCOUNT#${accountId}#REGION#${region}",
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
				composite: ["region"],
				template: "ISSUE_SUBSCRIBER#${region}",
				casing: "none"
			}
		}
	}
});

export const issueSubscriptionEntity = new Entity({
	model: { ...model, entity: "issueSubscription" },
	attributes: {
		appName: { type: "string", required: true },
		stageName: { type: "string", required: true },
		accountId: { type: "string", required: true },
		region: { type: "string", required: true },
		logGroup: { type: "string", required: true },
		filterName: { type: "string", required: true },
		functionArn: { type: "string" },
		status: {
			type: ["pending", "attached", "failed", "removed"] as const,
			required: true
		},
		lastError: { type: "string" },
		updatedAt: { type: "string", required: true },
		schemaVersion: { type: "string", default: "1" }
	},
	indexes: {
		stage: {
			pk: {
				field: "pk",
				composite: ["appName", "stageName"],
				template: "APP#${appName}#STAGE#${stageName}",
				casing: "none"
			},
			sk: {
				field: "sk",
				composite: ["region", "logGroup"],
				template: "ISSUE_SUBSCRIPTION#${region}#${logGroup}",
				casing: "none"
			}
		},
		bySource: {
			index: "lookup",
			pk: {
				field: "lookupPk",
				composite: ["accountId", "region", "logGroup"],
				template: "ISSUE_SOURCE#${accountId}#${region}#${logGroup}",
				casing: "none"
			},
			sk: {
				field: "lookupSk",
				composite: ["appName", "stageName"],
				template: "APP#${appName}#STAGE#${stageName}",
				casing: "none"
			}
		},
		byType: {
			index: "entitiesByType",
			pk: {
				field: "entityType",
				composite: [],
				template: "ISSUE_SUBSCRIPTION",
				casing: "none"
			},
			sk: {
				field: "entitySort",
				composite: ["appName", "stageName", "region", "logGroup"],
				template:
					"APP#${appName}#STAGE#${stageName}#REGION#${region}#LOG_GROUP#${logGroup}",
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
				composite: ["appName", "stageName", "region", "logGroup"],
				template:
					"ISSUE_SUBSCRIPTION#${appName}#${stageName}#${region}#${logGroup}",
				casing: "none"
			}
		}
	}
});

export const issueEntity = new Entity({
	model: { ...model, entity: "issue" },
	attributes: {
		appName: { type: "string", required: true },
		stageName: { type: "string", required: true },
		fingerprint: { type: "string", required: true },
		accountId: { type: "string", required: true },
		region: { type: "string", required: true },
		functionArn: { type: "string" },
		functionName: { type: "string" },
		errorType: { type: "string", required: true },
		errorMessage: { type: "string", required: true },
		stack: { type: "string" },
		status: {
			type: ["open", "resolved", "suppressed"] as const,
			required: true
		},
		statusUpdatedAt: { type: "string", required: true },
		count: { type: "number", required: true },
		firstSeenAt: { type: "string", required: true },
		lastSeenAt: { type: "string", required: true },
		logGroup: { type: "string", required: true },
		logStream: { type: "string", required: true },
		logTimestamp: { type: "number", required: true },
		schemaVersion: { type: "string", default: "1" }
	},
	indexes: {
		stage: {
			pk: {
				field: "pk",
				composite: ["appName", "stageName"],
				template: "APP#${appName}#STAGE#${stageName}",
				casing: "none"
			},
			sk: {
				field: "sk",
				composite: ["fingerprint"],
				template: "ISSUE#${fingerprint}",
				casing: "none"
			}
		},
		byType: {
			index: "entitiesByType",
			pk: {
				field: "entityType",
				composite: [],
				template: "ISSUE",
				casing: "none"
			},
			sk: {
				field: "entitySort",
				composite: [
					"appName",
					"stageName",
					"lastSeenAt",
					"fingerprint"
				],
				template:
					"APP#${appName}#STAGE#${stageName}#LAST_SEEN#${lastSeenAt}#ISSUE#${fingerprint}",
				casing: "none"
			}
		}
	}
});
