import type { Notification } from "../notification";

const webhookPattern =
	/^https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\//;

const maxBodyLength = 3_900;

/** Validates a Discord webhook URL without logging its credential-bearing path. */
export function isDiscordWebhookUrl(value: string) {
	return webhookPattern.test(value);
}

/** Delivers a generic notification through a Discord webhook. */
export async function send(input: {
	webhookUrl: string;
	notification: Notification;
}) {
	const { notification } = input;
	const response = await fetch(input.webhookUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			embeds: [
				{
					title: notification.title,
					description: `\`\`\`\n${notification.body
						.slice(0, maxBodyLength)
						.replaceAll("```", "``\u200b`")}\n\`\`\``,
					color:
						notification.severity === "error" ? 0xed3b3b : 0x1976d2,
					fields: notification.fields,
					timestamp: notification.occurredAt
				}
			]
		})
	});
	if (!response.ok)
		throw new Error(`Discord webhook returned HTTP ${response.status}`);
}
