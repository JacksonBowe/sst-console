import { z } from "zod";

import { passwordPolicy } from "./password-policy";

let PasswordSchema = z.string().min(passwordPolicy.minimumLength);

if (passwordPolicy.requireLowercase) {
	PasswordSchema = PasswordSchema.regex(/[a-z]/);
}

if (passwordPolicy.requireNumbers) {
	PasswordSchema = PasswordSchema.regex(/[0-9]/);
}

if (passwordPolicy.requireSymbols) {
	PasswordSchema = PasswordSchema.regex(/[^A-Za-z0-9]/);
}

if (passwordPolicy.requireUppercase) {
	PasswordSchema = PasswordSchema.regex(/[A-Z]/);
}

export const UserAuthJsonSchema = z.object({
	email: z.email(),
	password: PasswordSchema
});

export type UserAuthJson = z.infer<typeof UserAuthJsonSchema>;

export type Session = {
	accessToken: string;
	refreshToken?: string;
	idToken: string;
	expiresIn: number;
	tokenType: string;
};

export const UserInviteConfirmJsonSchema = z.object({
	email: z.email(),
	session: z.string(),
	newPassword: PasswordSchema
});

export type UserInviteConfirmJson = z.infer<typeof UserInviteConfirmJsonSchema>;

export const UserRefreshJsonSchema = z.object({
	refreshToken: z.string()
});

export type UserRefreshJson = z.infer<typeof UserRefreshJsonSchema>;

export const UserRecoverJsonSchema = z.object({
	email: z.email()
});

export type UserRecoverJson = z.infer<typeof UserRecoverJsonSchema>;

export const UserRecoverConfirmJsonSchema = z.object({
	email: z.email(),
	code: z.string().length(6),
	newPassword: PasswordSchema
});

export type UserRecoverConfirmJson = z.infer<
	typeof UserRecoverConfirmJsonSchema
>;

export const UserResendConfirmationJsonSchema = z.object({
	email: z.email()
});

export type UserResendConfirmationJson = z.infer<
	typeof UserResendConfirmationJsonSchema
>;
