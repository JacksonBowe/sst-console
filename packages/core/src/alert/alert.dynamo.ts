import { Entity } from "electrodb";

const model = {
	service: "sstConsole",
	version: "1"
} as const;

export const alertEntity = new Entity({
	model: { ...model, entity: "alert" },
	attributes: {
		id: { type: "string", required: true },
		type: { type: ["issue"] as const, required: true },
		appName: { type: "string" },
		stageName: { type: "string" },
		targetIds: { type: "list", items: { type: "string" }, required: true },
		createdAt: { type: "string", required: true },
		updatedAt: { type: "string", required: true },
		schemaVersion: { type: "string", default: "1" }
	},
	indexes: {
		alert: {
			pk: {
				field: "pk",
				composite: ["id"],
				template: "ALERT#${id}",
				casing: "none"
			},
			sk: { field: "sk", composite: [], template: "ALERT" }
		},
		byType: {
			index: "entitiesByType",
			pk: {
				field: "entityType",
				composite: [],
				template: "ALERT",
				casing: "none"
			},
			sk: {
				field: "entitySort",
				composite: ["id"],
				template: "ALERT#${id}",
				casing: "none"
			}
		}
	}
});
