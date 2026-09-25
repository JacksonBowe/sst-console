# Authentication setup

`sst deploy` creates a Cognito User Pool and an API client. Deployment outputs
include `consoleUrl`, `userPoolId`, and `apiClientId`.

## Create an MVP user

1. Open AWS Console for deployed region.
2. Open Cognito, then `User pools`.
3. Select pool identified by `userPoolId` deployment output.
4. Create user with email address and temporary password.
5. Send temporary password using Cognito default email delivery.

Public sign-up is disabled. Cognito sends password-recovery messages using its
default delivery service; no SES setup is required.

Configure password policy in `console.config.ts` under `auth.passwordPolicy`.
`console.config.example.ts` lists all basic Cognito password-policy values with
Cognito defaults.

The API client has no secret and is linked only to API Lambda. Static site does
not receive Cognito configuration until browser authentication is added.
