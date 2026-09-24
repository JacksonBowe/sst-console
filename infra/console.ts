const identity = aws.getCallerIdentityOutput();

export const externalId = $interpolate`sst-console:${identity.accountId}:${$app.stage}`;
