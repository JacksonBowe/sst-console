export type CognitoAuthStep =
	| "sign-in"
	| "sign-up"
	| "confirm-sign-up"
	| "forgot-password"
	| "confirm-forgot-password"
	| "new-password-required";

export type CognitoAuthStatusTone = "positive" | "negative" | "info";

export interface CognitoAuthStatus {
	tone: CognitoAuthStatusTone;
	message: string;
}

export interface CognitoAuthAssets {
	logoSrc?: string;
	logoAlt?: string;
}

export interface CognitoAuthTexts {
	signInTitle: string;
	signInSubtitle: string;
	signUpTitle: string;
	signUpSubtitle: string;
	confirmSignUpTitle: string;
	confirmSignUpSubtitle: string;
	forgotPasswordTitle: string;
	forgotPasswordSubtitle: string;
	confirmForgotPasswordTitle: string;
	confirmForgotPasswordSubtitle: string;
	newPasswordRequiredTitle: string;
	newPasswordRequiredSubtitle: string;
	nameLabel: string;
	emailLabel: string;
	passwordLabel: string;
	newPasswordLabel: string;
	confirmPasswordLabel: string;
	codeLabel: string;
	signInButton: string;
	signUpButton: string;
	confirmSignUpButton: string;
	sendResetCodeButton: string;
	resetPasswordButton: string;
	setPasswordButton: string;
	resendCodeButton: string;
	forgotPasswordLink: string;
	signUpLink: string;
	backToSignInLink: string;
	verificationCodeSent: string;
	accountVerified: string;
	resetCodeSent: string;
	passwordUpdated: string;
	codeResent: string;
	resetCodeResent: string;
	passwordSet: string;
	genericError: string;
	requiredMessage: string;
	invalidEmailMessage: string;
	minPasswordMessage: string;
	passwordMismatchMessage: string;
}

export type CognitoAuthTextOverrides = Partial<CognitoAuthTexts>;

export interface CognitoSignInPayload {
	email: string;
	password: string;
}

export interface CognitoSignUpPayload {
	name: string;
	email: string;
	password: string;
}

export interface CognitoConfirmSignUpPayload {
	email: string;
	code: string;
}

export interface CognitoForgotPasswordPayload {
	email: string;
}

export interface CognitoConfirmForgotPasswordPayload {
	email: string;
	code: string;
	newPassword: string;
}

export interface CognitoNewPasswordRequiredPayload {
	email: string;
	session: string;
	newPassword: string;
}

export interface CognitoAuthActionResult {
	step?: CognitoAuthStep;
	status?: CognitoAuthStatus | null;
	email?: string;
	session?: string;
}

export type MaybePromise<T> = T | Promise<T>;

export interface CognitoAuthHandlers {
	onSignIn?: (
		payload: CognitoSignInPayload
	) => MaybePromise<CognitoAuthActionResult | void>;
	onSignUp?: (
		payload: CognitoSignUpPayload
	) => MaybePromise<CognitoAuthActionResult | void>;
	onConfirmSignUp?: (
		payload: CognitoConfirmSignUpPayload
	) => MaybePromise<CognitoAuthActionResult | void>;
	onForgotPassword?: (
		payload: CognitoForgotPasswordPayload
	) => MaybePromise<CognitoAuthActionResult | void>;
	onConfirmForgotPassword?: (
		payload: CognitoConfirmForgotPasswordPayload
	) => MaybePromise<CognitoAuthActionResult | void>;
	onNewPasswordRequired?: (
		payload: CognitoNewPasswordRequiredPayload
	) => MaybePromise<CognitoAuthActionResult | void>;
	onResendSignUpCode?: (
		email: string
	) => MaybePromise<CognitoAuthActionResult | void>;
	onResendForgotPasswordCode?: (
		email: string
	) => MaybePromise<CognitoAuthActionResult | void>;
}
