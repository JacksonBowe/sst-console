import { Entity } from "electrodb";

const model = {
	service: "sstConsole",
	version: "1"
} as const;

export const alertRuleEntity = new Entity({
	model: { ...model, entity: "alertRule" },
	attributes: {
		id: { type: "string", required: true },
		type: { type: ["issue"] as const, required: true },
		appName: { type: "string" },
		stageName: { type: "string" },
		notificationDestinationIds: {
			type: "list",
			items: { type: "string" },
			required: true
		},
		createdAt: { type: "string", required: true },
		updatedAt: { type: "string", required: true },
		schemaVersion: { type: "string", default: "1" }
	},
	indexes: {
		alertRule: {
			pk: {
				field: "pk",
				composite: ["id"],
				template: "ALERT_RULE#${id}",
				casing: "none"
			},
			sk: { field: "sk", composite: [], template: "ALERT_RULE" }
		},
		byType: {
			index: "entitiesByType",
			pk: {
				field: "entityType",
				composite: [],
				template: "ALERT_RULE",
				casing: "none"
			},
			sk: {
				field: "entitySort",
				composite: ["id"],
				template: "ALERT_RULE#${id}",
				casing: "none"
			}
		}
	}
});
