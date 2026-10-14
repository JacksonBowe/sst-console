import { ulid } from "ulid";
import { z } from "zod";

import * as AlertTarget from "../alert-target";
import { db } from "../db";
import { isULID } from "../error";
import type { Issue } from "../issue";
import { fn } from "../util/fn";

const AlertSourceSchema = z
	.object({
		appName: z.string().min(1).optional(),
		stageName: z.string().min(1).optional()
	})
	.refine(input => !input.stageName || input.appName, {
		message: "A Stage Alert source requires an App source"
	});

export const AlertInputSchema = AlertSourceSchema.extend({
	type: z.literal("issue"),
	targetIds: z.array(isULID()).min(1)
});

export const AlertSchema = AlertInputSchema.extend({
	id: isULID(),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime()
});

export type Alert = z.infer<typeof AlertSchema>;

/** Creates an Alert routing configuration. */
export const create = fn(AlertInputSchema, async input => {
	const now = new Date().toISOString();
	const alert = { ...input, id: ulid(), createdAt: now, updatedAt: now };
	await db.entities.alert.create(alert).go({ response: "none" });
	return alert;
});

/** Lists Alert routing configurations. */
export async function list(): Promise<Alert[]> {
	return listRecords();
}

/** Replaces one Alert routing configuration. */
export const update = fn(
	AlertInputSchema.extend({ id: isULID() }),
	async ({ id, ...input }) => {
		await db.entities.alert
			.patch({ id })
			.set({ ...input, updatedAt: new Date().toISOString() })
			.go({ response: "none" });
		return get(id);
	}
);

/** Removes one Alert routing configuration. */
export const remove = fn(z.object({ id: isULID() }), async ({ id }) => {
	await db.entities.alert.delete({ id }).go({ response: "none" });
});

/** Sends every matching Issue Alert to its configured targets. */
export async function sendIssueAlert(issue: Issue) {
	for (const alert of await listRecords()) {
		if (!matchesIssue(alert, issue)) continue;
		const targets = await Promise.all(
			alert.targetIds.map(AlertTarget.find)
		);
		for (const target of targets) {
			if (!target) continue;
			try {
				await AlertTarget.sendIssueAlert(target, issue);
			} catch (error) {
				console.error("Alert delivery failed", {
					alertId: alert.id,
					targetId: target.id,
					appName: issue.appName,
					stageName: issue.stageName,
					error:
						error instanceof Error ? error.message : "Unknown error"
				});
			}
		}
	}
}

function matchesIssue(alert: Alert, issue: Issue) {
	return (
		alert.type === "issue" &&
		(!alert.appName || alert.appName === issue.appName) &&
		(!alert.stageName || alert.stageName === issue.stageName)
	);
}

async function listRecords(): Promise<Alert[]> {
	const result = await db.entities.alert.query
		.byType({})
		.go({ pages: "all" });
	return result.data.map(alert => AlertSchema.parse(alert));
}

async function get(id: string): Promise<Alert> {
	const result = await db.entities.alert.get({ id }).go({ consistent: true });
	if (!result.data) throw new Error("Alert was not found after update");
	return AlertSchema.parse(result.data);
}
