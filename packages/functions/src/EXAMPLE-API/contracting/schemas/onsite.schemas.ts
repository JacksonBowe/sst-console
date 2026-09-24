import { isULID } from "@sigil/core/error";
import { OnSiteTaskTemplateSchema } from "@sigil/core/contracting/job/onsite/template.schema";
import { z } from "zod";

export const OnSiteTaskTemplateIdPathParamsSchema = z.object({
	taskTemplateId: isULID()
});

export type OnSiteTaskTemplateIdPathParams = z.infer<
	typeof OnSiteTaskTemplateIdPathParamsSchema
>;

export const CreateOnSiteTaskTemplateJsonSchema = z.object({
	name: z.string().min(1)
});

export type CreateOnSiteTaskTemplateJson = z.infer<
	typeof CreateOnSiteTaskTemplateJsonSchema
>;

export const UpdateOnSiteTaskTemplateJsonSchema = z.object({
	name: z.string().min(1).optional()
});

export type UpdateOnSiteTaskTemplateJson = z.infer<
	typeof UpdateOnSiteTaskTemplateJsonSchema
>;

export const ListOnSiteTaskTemplatesQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
	cursor: isULID().optional()
});

export type ListOnSiteTaskTemplatesQuery = z.infer<
	typeof ListOnSiteTaskTemplatesQuerySchema
>;

export const OnSiteTaskTemplateSchemaRevisionIdPathParamsSchema = z.object({
	taskTemplateId: isULID(),
	schemaRevisionId: isULID()
});

export type OnSiteTaskTemplateSchemaRevisionIdPathParams = z.infer<
	typeof OnSiteTaskTemplateSchemaRevisionIdPathParamsSchema
>;

export const ListOnSiteTaskTemplateSchemaRevisionsQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
	cursor: isULID().optional()
});

export type ListOnSiteTaskTemplateSchemaRevisionsQuery = z.infer<
	typeof ListOnSiteTaskTemplateSchemaRevisionsQuerySchema
>;

export const UpdateOnSiteTaskTemplateSchemaRevisionJsonSchema = z.object({
	schema: OnSiteTaskTemplateSchema
});

export type UpdateOnSiteTaskTemplateSchemaRevisionJson = z.infer<
	typeof UpdateOnSiteTaskTemplateSchemaRevisionJsonSchema
>;
