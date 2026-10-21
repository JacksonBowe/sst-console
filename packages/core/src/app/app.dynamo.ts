import { Entity } from "electrodb";

const model = {
	service: "sstConsole",
	version: "1"
} as const;

export const appEntity = new Entity({
	model: { ...model, entity: "app" },
	attributes: {
		appName: { type: "string", required: true },
		createdAt: { type: "string", required: true },
		updatedAt: { type: "string", required: true },
		schemaVersion: { type: "string", default: "2" }
	},
	indexes: {
		app: {
			pk: {
				field: "pk",
				composite: ["appName"],
				template: "APP#${appName}",
				casing: "none"
			},
			sk: {
				field: "sk",
				composite: [],
				template: "APP",
				casing: "none"
			}
		},
		byType: {
			index: "entitiesByType",
			pk: {
				field: "entityType",
				composite: [],
				template: "APP",
				casing: "none"
			},
			sk: {
				field: "entitySort",
				composite: ["appName"],
				template: "APP#${appName}",
				casing: "none"
			}
		}
	}
});

export const stageEntity = new Entity({
	model: { ...model, entity: "stage" },
	attributes: {
		accountId: { type: "string", required: true },
		region: { type: "string", required: true },
		appName: { type: "string", required: true },
		stageName: { type: "string", required: true },
		issueMonitoringEnabled: { type: "boolean", default: false },
		createdAt: { type: "string", required: true },
		updatedAt: { type: "string", required: true },
		schemaVersion: { type: "string", default: "2" }
	},
	indexes: {
		stage: {
			pk: {
				field: "pk",
				composite: ["appName"],
				template: "APP#${appName}",
				casing: "none"
			},
			sk: {
				field: "sk",
				composite: ["stageName"],
				template: "STAGE#${stageName}",
				casing: "none"
			}
		},
		byType: {
			index: "entitiesByType",
			pk: {
				field: "entityType",
				composite: [],
				template: "STAGE",
				casing: "none"
			},
			sk: {
				field: "entitySort",
				composite: ["appName", "stageName"],
				template: "APP#${appName}#STAGE#${stageName}",
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
				template: "STAGE#${appName}#${stageName}",
				casing: "none"
			}
		}
	}
});

export const resourceEntity = new Entity({
	model: { ...model, entity: "resource" },
	attributes: {
		accountId: { type: "string", required: true },
		appName: { type: "string", required: true },
		stageName: { type: "string", required: true },
		resourceId: { type: "string", required: true },
		parentResourceId: { type: "string" },
		resourceKind: {
			type: ["component", "physical"] as const,
			required: true
		},
		resourceType: { type: "string", required: true },
		urn: { type: "string", required: true },
		normalizedArn: { type: "string" },
		name: { type: "string" },
		summary: { type: "any" },
		createdAt: { type: "string", required: true },
		updatedAt: { type: "string", required: true },
		schemaVersion: { type: "string", default: "2" }
	},
	indexes: {
		resource: {
			pk: {
				field: "pk",
				composite: ["appName", "stageName"],
				template: "APP#${appName}#STAGE#${stageName}",
				casing: "none"
			},
			sk: {
				field: "sk",
				composite: ["resourceId"],
				template: "RESOURCE#${resourceId}",
				casing: "none"
			}
		},
		byType: {
			index: "entitiesByType",
			pk: {
				field: "entityType",
				composite: [],
				template: "RESOURCE",
				casing: "none"
			},
			sk: {
				field: "entitySort",
				composite: ["accountId", "appName", "stageName", "resourceId"],
				template:
					"ACCOUNT#${accountId}#APP#${appName}#STAGE#${stageName}#RESOURCE#${resourceId}",
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
				composite: ["appName", "stageName", "resourceId"],
				template: "RESOURCE#${appName}#${stageName}#${resourceId}",
				casing: "none"
			}
		}
	}
});
