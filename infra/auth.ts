import type { ConsoleConfig } from "../console.config.types";
import { consoleData } from "./storage";

const { default: config } = (await import("../console.config")) as {
	default: ConsoleConfig;
};

export const passwordPolicy = config.auth.passwordPolicy;

export const cognitoUserPool = new sst.aws.CognitoUserPool(
	"SSTConsoleCognitoUserPool",
	{
		triggers: {
			customMessage: {
				handler:
					"packages/functions/src/cognito/custom-message.handler",
				link: [consoleData]
			}
		},
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
					allowAdminCreateUserOnly: true,
					...config.auth.adminCreateUserConfig,
					inviteMessageTemplate: {
						emailSubject: "Your SST Console invitation",
						emailMessage: `<p>You have been invited to SST Console.</p>${config.domain?.name ? `<p>Sign in at https://${config.domain.name}</p>` : ""}<p>Username: <strong>{username}</strong><br>Temporary password: <strong>{####}</strong></p><p>Change your password when prompted at first sign-in.</p>`,
						smsMessage:
							"Your SST Console username is {username} and temporary password is {####}",
						...config.auth.adminCreateUserConfig
							?.inviteMessageTemplate
					}
				},
				deletionProtection:
					$app.stage === "prod" ? "ACTIVE" : "INACTIVE",
				passwordPolicy
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
