import { isULID } from "@sigil/core/error";
import { OrganisationRoleSchema } from "@sigil/core/organisation/organisation.sql";
import { z } from "zod";

export const UserIdPathParamsSchema = z.object({
	userId: isULID()
});

export type UserIdPathParams = z.infer<typeof UserIdPathParamsSchema>;

export const AddMemberJsonSchema = z.object({
	userId: isULID(),
	role: OrganisationRoleSchema.default("member")
});

export type AddMemberJson = z.infer<typeof AddMemberJsonSchema>;

export const UpdateMemberRoleJsonSchema = z.object({
	role: OrganisationRoleSchema
});

export type UpdateMemberRoleJson = z.infer<typeof UpdateMemberRoleJsonSchema>;

export const ListMembersQuerySchema = z.object({
	role: OrganisationRoleSchema.optional(),
	limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
	cursor: isULID().optional()
});

export type ListMembersQuery = z.infer<typeof ListMembersQuerySchema>;
