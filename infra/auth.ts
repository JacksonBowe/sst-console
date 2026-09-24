// export const cognitoUserPool = new sst.aws.CognitoUserPool(
// 	"SSTConsoleCognitoUserPool",
// 	{
// 		transform: {
// 			userPool: {
// 				// emailConfiguration: {
// 				// 	emailSendingAccount: "DEVELOPER",
// 				// 	fromEmailAddress: softwareEmail.sender,
// 				// 	replyToEmailAddress: softwareEmail.sender,
// 				// 	sourceArn: softwareEmail.nodes.identity.arn
// 				// },
// 				// emailVerificationSubject
// 				usernameAttributes: ["email"],
// 				autoVerifiedAttributes: ["email"],

// 				accountRecoverySetting: {
// 					recoveryMechanisms: [
// 						{
// 							name: "verified_email",
// 							priority: 1
// 						}
// 					]
// 				},
// 				passwordPolicy: {
// 					minimumLength: 8
// 				},
// 				deletionProtection: "ACTIVE"
// 			}
// 		},

// 		triggers: {
// 			// customMessage: {
// 			// 	handler: "packages/functions/src/events/external/cognito_custom_message.handler",
// 			// 	copyFiles: [{ from: 'packages/mail/templates', to: 'templates' }],
// 			// 	environment: {
// 			// 		STAGE: $app.stage
// 			// 	}
// 			// }
// 		}
// 	}
// );

// export const cognitoUserPoolClient = cognitoUserPool.addClient(
// 	"SSTConsoleCognitoUserPoolClient",
// 	{
// 		transform: {
// 			client: {
// 				accessTokenValidity: 24, // Hours
// 				explicitAuthFlows: [
// 					"ALLOW_ADMIN_USER_PASSWORD_AUTH",
// 					"ALLOW_REFRESH_TOKEN_AUTH",
// 					"ALLOW_USER_PASSWORD_AUTH"
// 				],
// 				preventUserExistenceErrors: "ENABLED"
// 			}
// 		}
// 	}
// );

// export const cognitoIdentityPool = new sst.aws.CognitoIdentityPool(
// 	"SSTConsoleCognitoIdentityPool",
// 	{
// 		userPools: [
// 			{
// 				userPool: cognitoUserPool.id,
// 				client: cognitoUserPoolClient.id
// 			}
// 		]
// 	}
// );
