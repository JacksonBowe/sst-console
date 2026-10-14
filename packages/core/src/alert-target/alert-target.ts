import { ulid } from "ulid";
import { z } from "zod";

import * as Discord from "../integration/discord";
import type { Issue } from "../issue";
import { db } from "../db";
import { ConflictError, isULID, NotFoundError } from "../error";
import { fn } from "../util/fn";

const DiscordConfigSchema = z.object({
	webhookUrl: z
		.string()
		.refine(Discord.isDiscordWebhookUrl, "Invalid Discord webhook URL")
});

export const AlertTargetInputSchema = z.object({
	name: z.string().min(1).max(100),
	channel: z.literal("discord"),
	channelConfig: DiscordConfigSchema
});

export const AlertTargetSchema = AlertTargetInputSchema.extend({
	id: isULID(),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime()
});

export const AlertTargetInfoSchema = z.object({
	id: isULID(),
	name: z.string().min(1),
	channel: z.literal("discord"),
	configured: z.literal(true),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime()
});

export type AlertTarget = z.infer<typeof AlertTargetSchema>;
export type AlertTargetInfo = z.infer<typeof AlertTargetInfoSchema>;

/** Creates a reusable Alert delivery target. */
export const create = fn(AlertTargetInputSchema, async input => {
	const now = new Date().toISOString();
	const target = { ...input, id: ulid(), createdAt: now, updatedAt: now };
	await db.entities.alertTarget.create(target).go({ response: "none" });
	return toInfo(target);
});

/** Lists configured delivery targets without exposing channel credentials. */
export async function list(): Promise<AlertTargetInfo[]> {
	const result = await db.entities.alertTarget.query
		.byType({})
		.go({ pages: "all" });
	return result.data.map(target => toInfo(AlertTargetSchema.parse(target)));
}

/** Replaces one Alert delivery target. Existing Alerts use its new configuration. */
export const update = fn(
	AlertTargetInputSchema.extend({ id: isULID() }),
	async ({ id, ...input }) => {
		await db.entities.alertTarget
			.patch({ id })
			.set({ ...input, updatedAt: new Date().toISOString() })
			.go({ response: "none" });
		return toInfo(await get(id));
	}
);

/** Deletes an unused target. Referenced targets must be removed from Alerts first. */
export const remove = fn(z.object({ id: isULID() }), async ({ id }) => {
	const alerts = await db.entities.alert.query
		.byType({})
		.go({ pages: "all" });
	const referenced = alerts.data
		.map(alert => z.array(isULID()).parse(alert.targetIds))
		.some(targetIds => targetIds.includes(id));
	if (referenced)
		throw new ConflictError(
			"alert_target_in_use",
			"Remove this target from its Alerts before deleting it"
		);
	await db.entities.alertTarget.delete({ id }).go({ response: "none" });
});

/** Looks up a target for Alert event dispatch. */
export async function find(id: string): Promise<AlertTarget | null> {
	const result = await db.entities.alertTarget
		.get({ id })
		.go({ consistent: true });
	return result.data ? AlertTargetSchema.parse(result.data) : null;
}

/** Delivers an Issue Alert through a target's configured channel. */
export async function sendIssueAlert(target: AlertTarget, issue: Issue) {
	if (target.channel === "discord")
		await Discord.sendDiscordIssueAlert({
			webhookUrl: target.channelConfig.webhookUrl,
			issue
		});
}

/** Sends a proof-of-connection message through one configured target. */
export const test = fn(z.object({ id: isULID() }), async ({ id }) => {
	const target = await find(id);
	if (!target)
		throw new NotFoundError(
			"alert_target_not_found",
			"Alert target not found"
		);
	if (target.channel === "discord")
		await Discord.sendDiscordTestAlert(target.channelConfig.webhookUrl);
});

async function get(id: string): Promise<AlertTarget> {
	const target = await find(id);
	if (!target) throw new Error("Alert target was not found after update");
	return target;
}

function toInfo(target: AlertTarget): AlertTargetInfo {
	return AlertTargetInfoSchema.parse({
		id: target.id,
		name: target.name,
		channel: target.channel,
		configured: true,
		createdAt: target.createdAt,
		updatedAt: target.updatedAt
	});
}
