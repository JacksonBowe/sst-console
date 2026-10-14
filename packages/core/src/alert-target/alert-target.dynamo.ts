import { Entity } from "electrodb";

const model = { service: "sstConsole", version: "1" } as const;

export const alertTargetEntity = new Entity({
	model: { ...model, entity: "alertTarget" },
	attributes: {
		id: { type: "string", required: true },
		name: { type: "string", required: true },
		channel: { type: ["discord"] as const, required: true },
		channelConfig: {
			type: "map",
			required: true,
			properties: { webhookUrl: { type: "string", required: true } }
		},
		createdAt: { type: "string", required: true },
		updatedAt: { type: "string", required: true },
		schemaVersion: { type: "string", default: "1" }
	},
	indexes: {
		alertTarget: {
			pk: {
				field: "pk",
				composite: ["id"],
				template: "ALERT_TARGET#${id}",
				casing: "none"
			},
			sk: { field: "sk", composite: [], template: "ALERT_TARGET" }
		},
		byType: {
			index: "entitiesByType",
			pk: {
				field: "entityType",
				composite: [],
				template: "ALERT_TARGET",
				casing: "none"
			},
			sk: {
				field: "entitySort",
				composite: ["name", "id"],
				template: "ALERT_TARGET#${name}#${id}",
				casing: "none"
			}
		}
	}
});
