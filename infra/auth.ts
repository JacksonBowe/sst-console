import type { ConsoleConfig } from "../console.config.types";

const { default: config } = (await import("../console.config")) as {
	default: ConsoleConfig;
};

export const cognitoUserPool = new sst.aws.CognitoUserPool(
	"SSTConsoleCognitoUserPool",
	{
		transform: {
			userPool: {
				// emailConfiguration: {
				// 	emailSendingAccount: "DEVELOPER",
				// 	fromEmailAddress: softwareEmail.sender,
				// 	replyToEmailAddress: softwareEmail.sender,
				// 	sourceArn: softwareEmail.nodes.identity.arn
				// },
				usernameAttributes: ["email"],
				autoVerifiedAttributes: ["email"],

				accountRecoverySetting: {
					recoveryMechanisms: [
						{
							name: "verified_email",
							priority: 1
						}
					]
				},
				adminCreateUserConfig: {
					allowAdminCreateUserOnly: true
				},
				deletionProtection:
					$app.stage === "prod" ? "ACTIVE" : "INACTIVE",
				passwordPolicy: config.auth.passwordPolicy
			}
		}
	}
);

export const cognitoUserPoolClient = cognitoUserPool.addClient(
	"SSTConsoleCognitoUserPoolClient",
	{
		transform: {
			client: {
				allowedOauthFlowsUserPoolClient: false,
				accessTokenValidity: 24, // Hours
				explicitAuthFlows: [
					"ALLOW_REFRESH_TOKEN_AUTH",
					"ALLOW_USER_PASSWORD_AUTH"
				],
				generateSecret: false,
				preventUserExistenceErrors: "ENABLED"
			}
		}
	}
);
