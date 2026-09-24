import { isULID } from "@sigil/core/error";
import { z } from "zod";

export const CreateJobJsonSchema = z
	.object({
		name: z.string().min(1),
		description: z.string().optional(),
		contact: z
			.object({
				name: z.string().min(1).optional(),
				email: z.string().email().optional(),
				phone: z.string().min(1).optional()
			})
			.optional()
	})
	.strict();

export const JobAssetUpdateJsonSchema = z
	.object({
		id: isULID().optional(),
		name: z.string().min(1),
		documentVersionId: isULID()
	})
	.strict();

export const UpdateJobJsonSchema = z
	.object({
		name: z.string().min(1).optional(),
		description: z.string().nullable().optional(),
		contact: CreateJobJsonSchema.shape.contact.nullable().optional(),
		assets: z.array(JobAssetUpdateJsonSchema).optional(),
		onsiteTaskTemplateIds: z.array(isULID()).optional()
	})
	.strict();

export const JobIdPathParamsSchema = z.object({
	jobId: isULID()
});

export const ListJobsQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
	cursor: isULID().optional()
});

export type ListJobsQuery = z.infer<typeof ListJobsQuerySchema>;
export type CreateJobJson = z.infer<typeof CreateJobJsonSchema>;
export type UpdateJobJson = z.infer<typeof UpdateJobJsonSchema>;
export type JobIdPathParams = z.infer<typeof JobIdPathParamsSchema>;
