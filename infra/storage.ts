export const accounts = new sst.aws.Dynamo("Accounts", {
	fields: {
		accountId: "string"
	},
	primaryIndex: {
		hashKey: "accountId"
	}
});
