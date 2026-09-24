import { isULID } from "@sigil/core/error";
import { AddressSchema } from "@sigil/core/util/address";
import { z } from "zod";

export const CreateOrganisationJsonSchema = z.object({
	name: z.string().min(1),
	abn: z.string().nullish(),
	contactName: z.string().nullish(),
	email: z.email().nullish(),
	phone: z.string().nullish(),
	description: z.string().max(500).nullish(),
	address: AddressSchema.optional()
});

export type CreateOrganisationJson = z.infer<
	typeof CreateOrganisationJsonSchema
>;

export const UpdateOrganisationJsonSchema = z.object({
	name: z.string().min(1).optional(),
	abn: z.string().nullish(),
	contactName: z.string().nullish(),
	email: z.email().nullish(),
	phone: z.string().nullish(),
	description: z.string().max(500).nullish(),
	address: AddressSchema.optional()
});

export type UpdateOrganisationJson = z.infer<
	typeof UpdateOrganisationJsonSchema
>;

export const TargetOrgPathParamsSchema = z.object({
	targetOrgId: isULID()
});

export type TargetOrgPathParams = z.infer<typeof TargetOrgPathParamsSchema>;

export const ListOrganisationsQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(100).default(25).optional(),
	cursor: isULID().optional()
});

export type ListOrganisationsQuery = z.infer<
	typeof ListOrganisationsQuerySchema
>;

export const SearchOrganisationsQuerySchema = z.object({
	query: z.string().min(1).max(100),
	limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
	cursor: isULID().optional()
});

export type SearchOrganisationsQuery = z.infer<
	typeof SearchOrganisationsQuerySchema
>;
