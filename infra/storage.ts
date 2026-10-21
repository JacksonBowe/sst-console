export const consoleData = new sst.aws.Dynamo("ConsoleData", {
	ttl: "ttl",
	fields: {
		pk: "string",
		sk: "string",
		entityType: "string",
		entitySort: "string",
		accountPk: "string",
		accountSk: "string",
		lookupPk: "string",
		lookupSk: "string"
	},
	primaryIndex: {
		hashKey: "pk",
		rangeKey: "sk"
	},
	globalIndexes: {
		entitiesByType: {
			hashKey: "entityType",
			rangeKey: "entitySort"
		},
		entitiesByAwsAccount: {
			hashKey: "accountPk",
			rangeKey: "accountSk"
		},
		lookup: {
			hashKey: "lookupPk",
			rangeKey: "lookupSk"
		}
	}
});

export const consoleConnections = new sst.aws.Dynamo("ConsoleConnections", {
	fields: {
		pk: "string",
		sk: "string"
	},
	primaryIndex: {
		hashKey: "pk",
		rangeKey: "sk"
	}
});
