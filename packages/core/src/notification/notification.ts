import * as Discord from "../integration/discord";
import type { NotificationDestination } from "../notification-destination";

export type Notification = {
	title: string;
	body: string;
	severity: "info" | "error";
	occurredAt: string;
	fields: Array<{ name: string; value: string; inline: boolean }>;
};

/** Delivers one notification through its configured destination. */
export async function deliver(
	destination: NotificationDestination,
	notification: Notification
) {
	if (destination.channel === "discord")
		await Discord.send({
			webhookUrl: destination.channelConfig.webhookUrl,
			notification
		});
}

/** Creates a proof-of-connection notification. */
export function testMessage(): Notification {
	return {
		title: "SST Console test notification",
		body: "This message confirms SST Console can deliver notifications to this destination.",
		severity: "info",
		occurredAt: new Date().toISOString(),
		fields: []
	};
}
