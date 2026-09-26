import { Entity } from "electrodb";

export const connectionEntity = new Entity({
	model: {
		service: "sstConsoleConnections",
		entity: "connection",
		version: "1"
	},
	attributes: {
		accountId: { type: "string", required: true },
		region: { type: "string", required: true },
		roleArn: { type: "string", required: true },
		createdAt: { type: "string", required: true },
		updatedAt: { type: "string", required: true }
	},
	indexes: {
		connection: {
			pk: {
				field: "pk",
				composite: [],
				template: "CONNECTIONS",
				casing: "none"
			},
			sk: {
				field: "sk",
				composite: ["accountId"],
				template: "ACCOUNT#${accountId}",
				casing: "none"
			}
		}
	}
});
