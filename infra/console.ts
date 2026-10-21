import { connectionRoleName } from "./connection-name.ts";

const identity = aws.getCallerIdentityOutput();

export const controlAccountId = identity.accountId;
export const externalId = $interpolate`sst-console:${identity.accountId}:${$app.stage}`;
export const consoleInstallationDescription = $interpolate`SST Console hosted in AWS account "${identity.accountId}", stage "${$app.stage}".`;
export const connectorRoleName = $resolve({
	controlAccountId,
	stage: $app.stage
}).apply(({ controlAccountId, stage }) =>
	connectionRoleName(controlAccountId, stage)
);

export const assumeAccountRolePermission = {
	actions: ["sts:AssumeRole"],
	resources: [$interpolate`arn:aws:iam::*:role/${connectorRoleName}`]
};
