import { isULID } from "@console/core/error";
import { z } from "zod";

export const UserInviteJsonSchema = z.object({
	email: z.email()
});

export const UserIdParamSchema = z.object({
	id: isULID()
});

export const UserListQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(100).default(50),
	cursor: z.string().min(1).optional(),
	email: z.email().optional(),
	cognitoStatus: z.enum(["FORCE_CHANGE_PASSWORD", "CONFIRMED"]).optional(),
	cognitoEnabled: z
		.enum(["true", "false"])
		.optional()
		.transform(value =>
			value === undefined ? undefined : value === "true"
		)
});
