import { z } from "zod";

const PasswordPolicySchema = z.object({
	minimumLength: z.number().int().positive(),
	passwordHistorySize: z.number().int().nonnegative(),
	requireLowercase: z.boolean(),
	requireNumbers: z.boolean(),
	requireSymbols: z.boolean(),
	requireUppercase: z.boolean(),
	temporaryPasswordValidityDays: z.number().int().positive()
});

const rawPasswordPolicy = process.env.SST_CONSOLE_PASSWORD_POLICY;

if (!rawPasswordPolicy) {
	throw new Error("SST_CONSOLE_PASSWORD_POLICY is required");
}

export const passwordPolicy = PasswordPolicySchema.parse(
	JSON.parse(rawPasswordPolicy)
);
