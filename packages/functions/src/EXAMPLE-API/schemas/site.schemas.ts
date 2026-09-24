import { isULID } from "@sigil/core/error";
import { AddressSchema } from "@sigil/core/util/address";
import { z } from "zod";

export const CreateSiteJsonSchema = z
	.object({
		name: z.string().min(1),
		address: AddressSchema
	})
	.strict();

export const UpdateSiteJsonSchema = z
	.object({
		name: z.string().min(1).optional(),
		address: AddressSchema.optional()
	})
	.strict();

export const SitePathParamsSchema = z.object({
	siteId: isULID()
});

export const ListSitesQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
	cursor: isULID().optional()
});

export const CreateSiteContactJsonSchema = z
	.object({
		name: z.string().min(1),
		email: z.email(),
		mobile: z.string().min(1),
		priority: z.number().int().positive().optional()
	})
	.strict();

export const UpdateSiteContactJsonSchema = z
	.object({
		name: z.string().min(1).optional(),
		email: z.email().optional(),
		mobile: z.string().min(1).optional(),
		priority: z.number().int().positive().nullable().optional()
	})
	.strict();

export const SiteContactPathParamsSchema = SitePathParamsSchema.extend({
	contactId: isULID()
});

export type CreateSiteJson = z.infer<typeof CreateSiteJsonSchema>;
export type UpdateSiteJson = z.infer<typeof UpdateSiteJsonSchema>;
export type SitePathParams = z.infer<typeof SitePathParamsSchema>;
export type ListSitesQuery = z.infer<typeof ListSitesQuerySchema>;
export type CreateSiteContactJson = z.infer<typeof CreateSiteContactJsonSchema>;
export type UpdateSiteContactJson = z.infer<typeof UpdateSiteContactJsonSchema>;
export type SiteContactPathParams = z.infer<typeof SiteContactPathParamsSchema>;
