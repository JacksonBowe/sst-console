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
			index: "issueSubscriptionsBySource",
			pk: {
				field: "gsi6pk",
				composite: ["accountId", "region", "logGroup"],
				template: "ISSUE_SOURCE#${accountId}#${region}#${logGroup}",
				casing: "none"
			},
			sk: {
				field: "gsi6sk",
				composite: ["appName", "stageName"],
				template: "APP#${appName}#STAGE#${stageName}",
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
		error: { type: "string", required: true },
		message: { type: "string", required: true },
		count: { type: "number", required: true },
		firstSeenAt: { type: "string", required: true },
		lastSeenAt: { type: "string", required: true },
		logGroup: { type: "string", required: true },
		logStream: { type: "string", required: true },
		logTimestamp: { type: "number", required: true },
		resolvedAt: { type: "string" },
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
		}
	}
});
