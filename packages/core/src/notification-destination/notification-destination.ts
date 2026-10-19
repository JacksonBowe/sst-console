import { ulid } from "ulid";
import { z } from "zod";

import { db } from "../db";
import { ConflictError, isULID, NotFoundError } from "../error";
import * as Discord from "../integration/discord";
import * as Notification from "../notification";
import { fn } from "../util/fn";

const DiscordConfigSchema = z.object({
	webhookUrl: z
		.string()
		.refine(Discord.isDiscordWebhookUrl, "Invalid Discord webhook URL")
});

export const NotificationDestinationInputSchema = z.object({
	name: z.string().min(1).max(100),
	channel: z.literal("discord"),
	channelConfig: DiscordConfigSchema
});

export const NotificationDestinationSchema =
	NotificationDestinationInputSchema.extend({
		id: isULID(),
		createdAt: z.iso.datetime(),
		updatedAt: z.iso.datetime()
	});

export const NotificationDestinationInfoSchema = z.object({
	id: isULID(),
	name: z.string().min(1),
	channel: z.literal("discord"),
	configured: z.literal(true),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime()
});

export type NotificationDestination = z.infer<
	typeof NotificationDestinationSchema
>;
export type NotificationDestinationInfo = z.infer<
	typeof NotificationDestinationInfoSchema
>;

/** Creates a reusable notification destination. */
export const create = fn(NotificationDestinationInputSchema, async input => {
	const now = new Date().toISOString();
	const destination = {
		...input,
		id: ulid(),
		createdAt: now,
		updatedAt: now
	};
	await db.entities.notificationDestination
		.create(destination)
		.go({ response: "none" });
	return toInfo(destination);
});

/** Lists configured notification destinations without exposing credentials. */
export async function list(): Promise<NotificationDestinationInfo[]> {
	const result = await db.entities.notificationDestination.query
		.byType({})
		.go({ pages: "all" });
	return result.data.map(destination =>
		toInfo(NotificationDestinationSchema.parse(destination))
	);
}

/** Replaces one notification destination. Existing alert rules use it. */
export const update = fn(
	NotificationDestinationInputSchema.extend({ id: isULID() }),
	async ({ id, ...input }) => {
		await db.entities.notificationDestination
			.patch({ id })
			.set({ ...input, updatedAt: new Date().toISOString() })
			.go({ response: "none" });
		return toInfo(await get(id));
	}
);

/** Deletes an unused notification destination. */
export const remove = fn(z.object({ id: isULID() }), async ({ id }) => {
	const alertRules = await db.entities.alertRule.query
		.byType({})
		.go({ pages: "all" });
	const referenced = alertRules.data
		.map(alertRule =>
			z.array(isULID()).parse(alertRule.notificationDestinationIds)
		)
		.some(notificationDestinationIds =>
			notificationDestinationIds.includes(id)
		);
	if (referenced)
		throw new ConflictError(
			"notification_destination_in_use",
			"Remove this destination from its alert rules before deleting it"
		);
	await db.entities.notificationDestination
		.delete({ id })
		.go({ response: "none" });
});

/** Looks up a notification destination for delivery. */
export async function find(
	id: string
): Promise<NotificationDestination | null> {
	const result = await db.entities.notificationDestination
		.get({ id })
		.go({ consistent: true });
	return result.data
		? NotificationDestinationSchema.parse(result.data)
		: null;
}

/** Sends a test notification through one configured destination. */
export const test = fn(z.object({ id: isULID() }), async ({ id }) => {
	const destination = await find(id);
	if (!destination)
		throw new NotFoundError(
			"notification_destination_not_found",
			"Notification destination not found"
		);
	await Notification.deliver(destination, Notification.testMessage());
});

async function get(id: string): Promise<NotificationDestination> {
	const destination = await find(id);
	if (!destination)
		throw new Error("Notification destination was not found after update");
	return destination;
}

function toInfo(
	destination: NotificationDestination
): NotificationDestinationInfo {
	return NotificationDestinationInfoSchema.parse({
		id: destination.id,
		name: destination.name,
		channel: destination.channel,
		configured: true,
		createdAt: destination.createdAt,
		updatedAt: destination.updatedAt
	});
}
