export const consoleData = new sst.aws.Dynamo("ConsoleData", {
	fields: {
		pk: "string",
		sk: "string",
		gsi1pk: "string",
		gsi1sk: "string",
		gsi2pk: "string",
		gsi2sk: "string"
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
		}
	}
});
