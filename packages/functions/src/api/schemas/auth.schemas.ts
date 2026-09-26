import { z } from "zod";

export const UserAuthJsonSchema = z.object({
	email: z.email(),
	password: z.string().min(8)
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
	newPassword: z.string().min(8)
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
	newPassword: z.string().min(8)
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
