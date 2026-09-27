const identity = aws.getCallerIdentityOutput();

export const controlAccountId = identity.accountId;
export const externalId = $interpolate`sst-console:${identity.accountId}:${$app.stage}`;

export const assumeAccountRolePermission = {
	actions: ["sts:AssumeRole"],
	resources: ["arn:aws:iam::*:role/SSTConsoleRole"]
};
