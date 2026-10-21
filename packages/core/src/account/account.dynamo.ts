import { Entity } from "electrodb";

const model = {
	service: "sstConsole",
	version: "1"
} as const;

export const accountEntity = new Entity({
	model: { ...model, entity: "account" },
	attributes: {
		accountId: { type: "string", required: true },
		region: { type: "string", required: true },
		roleArn: { type: "string", required: true },
		status: {
			type: ["connected", "disconnected"] as const,
			required: true
		},
		stateBucket: { type: "string" },
		lastSyncedAt: { type: "string" },
		lastSyncConflicts: { type: "any" },
		createdAt: { type: "string" },
		updatedAt: { type: "string", required: true },
		schemaVersion: { type: "string", default: "1" }
	},
	indexes: {
		account: {
			pk: {
				field: "pk",
				composite: ["accountId"],
				template: "ACCOUNT#${accountId}",
				casing: "none"
			},
			sk: { field: "sk", composite: [], template: "ACCOUNT" }
		},
		byType: {
			index: "entitiesByType",
			pk: {
				field: "entityType",
				composite: [],
				template: "ACCOUNT",
				casing: "none"
			},
			sk: {
				field: "entitySort",
				composite: ["accountId"],
				template: "ACCOUNT#${accountId}",
				casing: "none"
			}
		}
	}
});
