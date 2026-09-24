import { isULID } from "@sigil/core/error";
import { z } from "zod";

export const PrepareDocumentUploadJsonSchema = z
	.object({
		fileName: z.string().min(1),
		mimeType: z.string().min(1),
		size: z.number().int().nonnegative(),
		checksum: z.string().min(1).optional(),
		checksumAlgorithm: z.literal("sha256").optional()
	})
	.refine(input => !input.checksum === !input.checksumAlgorithm, {
		message: "checksum and checksumAlgorithm must be supplied together",
		path: ["checksum"]
	});

export const CreateDocumentJsonSchema = z.object({
	name: z.string().min(1),
	description: z.string().max(1000).optional(),
	preparedUploadId: isULID()
});

export const CreateDocumentVersionJsonSchema = z.object({
	preparedUploadId: isULID()
});

export const ShareDocumentVersionJsonSchema = z.object({
	granteeOrganisationId: isULID()
});

export const DocumentPathParamsSchema = z.object({
	documentId: isULID()
});

export const DocumentVersionPathParamsSchema = DocumentPathParamsSchema.extend({
	versionId: isULID()
});

export const ListDocumentsQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
	cursor: isULID().optional()
});

export type PrepareDocumentUploadJson = z.infer<
	typeof PrepareDocumentUploadJsonSchema
>;
export type CreateDocumentJson = z.infer<typeof CreateDocumentJsonSchema>;
export type CreateDocumentVersionJson = z.infer<
	typeof CreateDocumentVersionJsonSchema
>;
export type ShareDocumentVersionJson = z.infer<
	typeof ShareDocumentVersionJsonSchema
>;
export type ListDocumentsQuery = z.infer<typeof ListDocumentsQuerySchema>;
