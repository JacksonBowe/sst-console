import { Entity } from "electrodb";

const model = {
	service: "sstConsole",
	version: "1"
} as const;

export const appEntity = new Entity({
	model: { ...model, entity: "app" },
	attributes: {
		accountId: { type: "string", required: true },
		appName: { type: "string", required: true },
		createdAt: { type: "string", required: true },
		updatedAt: { type: "string", required: true },
		schemaVersion: { type: "string", default: "1" }
	},
	indexes: {
		app: {
			pk: {
				field: "pk",
				composite: ["accountId"],
				template: "ACCOUNT#${accountId}",
				casing: "none"
			},
			sk: {
				field: "sk",
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
		appName: { type: "string", required: true },
		stageName: { type: "string", required: true },
		createdAt: { type: "string", required: true },
		updatedAt: { type: "string", required: true },
		schemaVersion: { type: "string", default: "1" }
	},
	indexes: {
		stage: {
			pk: {
				field: "pk",
				composite: ["accountId"],
				template: "ACCOUNT#${accountId}",
				casing: "none"
			},
			sk: {
				field: "sk",
				composite: ["appName", "stageName"],
				template: "APP#${appName}#STAGE#${stageName}",
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
		resourceType: { type: "string", required: true },
		urn: { type: "string", required: true },
		normalizedArn: { type: "string", required: true },
		name: { type: "string" },
		summary: { type: "any" },
		createdAt: { type: "string", required: true },
		updatedAt: { type: "string", required: true },
		schemaVersion: { type: "string", default: "1" }
	},
	indexes: {
		resource: {
			pk: {
				field: "pk",
				composite: ["accountId"],
				template: "ACCOUNT#${accountId}",
				casing: "none"
			},
			sk: {
				field: "sk",
				composite: ["appName", "stageName", "resourceId"],
				template:
					"APP#${appName}#STAGE#${stageName}#RESOURCE#${resourceId}",
				casing: "none"
			}
		},
		byArn: {
			index: "resourcesByArn",
			pk: {
				field: "gsi2pk",
				composite: ["normalizedArn"],
				template: "RESOURCE_ARN#${normalizedArn}",
				casing: "none"
			},
			sk: {
				field: "gsi2sk",
				composite: ["accountId", "appName", "stageName", "resourceId"],
				template:
					"ACCOUNT#${accountId}#APP#${appName}#STAGE#${stageName}#RESOURCE#${resourceId}",
				casing: "none"
			}
		}
	}
});
