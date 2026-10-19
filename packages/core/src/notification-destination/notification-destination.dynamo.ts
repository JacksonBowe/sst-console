import { Entity } from "electrodb";

const model = { service: "sstConsole", version: "1" } as const;

export const notificationDestinationEntity = new Entity({
	model: { ...model, entity: "notificationDestination" },
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
		notificationDestination: {
			pk: {
				field: "pk",
				composite: ["id"],
				template: "NOTIFICATION_DESTINATION#${id}",
				casing: "none"
			},
			sk: {
				field: "sk",
				composite: [],
				template: "NOTIFICATION_DESTINATION"
			}
		},
		byType: {
			index: "entitiesByType",
			pk: {
				field: "entityType",
				composite: [],
				template: "NOTIFICATION_DESTINATION",
				casing: "none"
			},
			sk: {
				field: "entitySort",
				composite: ["name", "id"],
				template: "NOTIFICATION_DESTINATION#${name}#${id}",
				casing: "none"
			}
		}
	}
});
