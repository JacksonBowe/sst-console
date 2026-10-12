import { z } from "zod";

export const AccountIdSchema = z.string().regex(/^\d{12}$/);
export const ConnectorRoleArnPattern =
	/^arn:(?:aws|aws-cn|aws-us-gov):iam::(?<accountId>\d{12}):role\/SSTConsoleRole-\d{12}-[a-f0-9]{16}$/;

export const AccountKeySchema = z.object({ accountId: AccountIdSchema });

export const AccountSchema = AccountKeySchema.extend({
	region: z.string().min(1),
	roleArn: z.string().min(1),
	status: z.enum(["connected", "disconnected"]),
	stateBucket: z.string().min(1).optional(),
	lastSyncedAt: z.iso.datetime().optional(),
	lastSyncConflicts: z.unknown().optional(),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime()
});

export const AccountUpdateSchema = AccountKeySchema.extend({
	region: z.string().min(1).optional(),
	roleArn: z.string().min(1).optional(),
	status: z.enum(["connected", "disconnected"]).optional(),
	stateBucket: z.string().min(1).optional(),
	lastSyncedAt: z.iso.datetime().optional(),
	lastSyncConflicts: z.unknown().optional(),
	updatedAt: z.iso.datetime().optional()
}).refine(
	input =>
		input.region !== undefined ||
		input.roleArn !== undefined ||
		input.status !== undefined ||
		input.stateBucket !== undefined ||
		input.lastSyncedAt !== undefined ||
		input.lastSyncConflicts !== undefined ||
		input.updatedAt !== undefined,
	"At least one Account field must be updated"
);

export const ConnectorSchema = z.object({
	region: z.string().min(1),
	roleArn: z.string().regex(ConnectorRoleArnPattern)
});

export const ConnectorCallbackSchema = ConnectorSchema.extend({
	accountId: AccountIdSchema,
	requestType: z.enum(["Create", "Update", "Delete"])
});

export const StateObjectKeySchema = AccountKeySchema.extend({
	appName: z.string().min(1),
	stageName: z.string().min(1)
});
