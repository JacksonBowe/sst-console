export const consoleData = new sst.aws.Dynamo("ConsoleData", {
	fields: {
		pk: "string",
		sk: "string",
		gsi1pk: "string",
		gsi1sk: "string",
		gsi2pk: "string",
		gsi2sk: "string",
		gsi3pk: "string",
		gsi3sk: "string",
		gsi4pk: "string",
		gsi4sk: "string"
	},
	primaryIndex: {
		hashKey: "pk",
		rangeKey: "sk"
	},
	globalIndexes: {
		accountsByStatus: {
			hashKey: "gsi1pk",
			rangeKey: "gsi1sk"
		},
		resourcesByArn: {
			hashKey: "gsi2pk",
			rangeKey: "gsi2sk"
		},
		stagesByAccount: {
			hashKey: "gsi3pk",
			rangeKey: "gsi3sk"
		},
		appsByName: {
			hashKey: "gsi4pk",
			rangeKey: "gsi4sk"
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
