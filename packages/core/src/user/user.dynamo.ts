import { Entity } from "electrodb";

export const CognitoStatus = ["FORCE_CHANGE_PASSWORD", "CONFIRMED"] as const;

const model = {
	service: "sstConsole",
	version: "1"
} as const;

export const userEntity = new Entity({
	model: { ...model, entity: "user" },
	attributes: {
		id: { type: "string", required: true },
		cognitoSub: { type: "string", required: true },
		email: { type: "string", required: true },
		cognitoStatus: {
			type: CognitoStatus,
			required: true
		},
		cognitoEnabled: { type: "boolean", required: true },
		createdAt: { type: "string", required: true },
		updatedAt: { type: "string", required: true },
		schemaVersion: { type: "string", default: "1" }
	},
	indexes: {
		user: {
			pk: {
				field: "pk",
				composite: ["id"],
				template: "USER#${id}",
				casing: "none"
			},
			sk: { field: "sk", composite: [], template: "USER" }
		},
		byId: {
			index: "usersById",
			pk: {
				field: "gsi5pk",
				composite: [],
				template: "USERS",
				casing: "none"
			},
			sk: {
				field: "gsi5sk",
				composite: ["id"],
				template: "USER#${id}",
				casing: "none"
			}
		}
	}
});

export const userIdentityEntity = new Entity({
	model: { ...model, entity: "userIdentity" },
	attributes: {
		cognitoSub: { type: "string", required: true },
		userId: { type: "string", required: true },
		createdAt: { type: "string", required: true },
		schemaVersion: { type: "string", default: "1" }
	},
	indexes: {
		cognito: {
			pk: {
				field: "pk",
				composite: ["cognitoSub"],
				template: "COGNITO#${cognitoSub}",
				casing: "none"
			},
			sk: { field: "sk", composite: [], template: "USER" }
		}
	}
});
