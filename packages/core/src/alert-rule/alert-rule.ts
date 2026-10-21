import { ulid } from "ulid";
import { z } from "zod";

import { db } from "../db";
import { isULID } from "../error";
import type { Issue } from "../issue";
import * as Notification from "../notification";
import * as NotificationDestination from "../notification-destination";
import { fn } from "../util/fn";

const AlertRuleSourceSchema = z
	.object({
		appName: z.string().min(1).optional(),
		stageName: z.string().min(1).optional()
	})
	.refine(input => !input.stageName || input.appName, {
		message: "A Stage alert rule source requires an App source"
	});

export const AlertRuleInputSchema = AlertRuleSourceSchema.extend({
	type: z.literal("issue"),
	notificationDestinationIds: z.array(isULID()).min(1)
});

export const AlertRuleSchema = AlertRuleInputSchema.extend({
	id: isULID(),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime()
});

export type AlertRule = z.infer<typeof AlertRuleSchema>;

/** Creates an alert rule. */
export const create = fn(AlertRuleInputSchema, async input => {
	const now = new Date().toISOString();
	const alertRule = { ...input, id: ulid(), createdAt: now, updatedAt: now };
	await db.entities.alertRule.create(alertRule).go({ response: "none" });
	return alertRule;
});

/** Lists alert rules. */
export async function list(): Promise<AlertRule[]> {
	return listRecords();
}

/** Replaces one alert rule. */
export const update = fn(
	AlertRuleInputSchema.extend({ id: isULID() }),
	async ({ id, ...input }) => {
		await db.entities.alertRule
			.patch({ id })
			.set({ ...input, updatedAt: new Date().toISOString() })
			.go({ response: "none" });
		return get(id);
	}
);

/** Removes one alert rule. */
export const remove = fn(z.object({ id: isULID() }), async ({ id }) => {
	await db.entities.alertRule.delete({ id }).go({ response: "none" });
});

/** Sends notifications for every matching Issue alert rule. */
export async function sendIssueNotifications(issue: Issue) {
	for (const alertRule of await listRecords()) {
		if (!matchesIssue(alertRule, issue)) continue;
		const destinations = await Promise.all(
			alertRule.notificationDestinationIds.map(
				NotificationDestination.find
			)
		);
		for (const destination of destinations) {
			if (!destination) continue;
			try {
				await Notification.deliver(
					destination,
					issueNotification(issue)
				);
			} catch (error) {
				console.error("Notification delivery failed", {
					alertRuleId: alertRule.id,
					notificationDestinationId: destination.id,
					appName: issue.appName,
					stageName: issue.stageName,
					error:
						error instanceof Error ? error.message : "Unknown error"
				});
			}
		}
	}
}

function matchesIssue(alertRule: AlertRule, issue: Issue) {
	return (
		alertRule.type === "issue" &&
		issue.status !== "suppressed" &&
		(!alertRule.appName || alertRule.appName === issue.appName) &&
		(!alertRule.stageName || alertRule.stageName === issue.stageName)
	);
}

function issueNotification(issue: Issue): Notification.Notification {
	return {
		title: `🚨 ${issue.errorType}`,
		body: issue.errorMessage,
		severity: "error",
		occurredAt: issue.lastSeenAt,
		fields: [
			{ name: "App", value: issue.appName, inline: true },
			{ name: "Stage", value: issue.stageName, inline: true },
			{
				name: "Function",
				value: issue.functionName ?? issue.logGroup,
				inline: false
			}
		]
	};
}

async function listRecords(): Promise<AlertRule[]> {
	const result = await db.entities.alertRule.query
		.byType({})
		.go({ pages: "all" });
	return result.data.map(alertRule => AlertRuleSchema.parse(alertRule));
}

async function get(id: string): Promise<AlertRule> {
	const result = await db.entities.alertRule
		.get({ id })
		.go({ consistent: true });
	if (!result.data) throw new Error("Alert rule was not found after update");
	return AlertRuleSchema.parse(result.data);
}
