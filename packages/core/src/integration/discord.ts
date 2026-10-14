import type { Issue } from "../issue";

const webhookPattern =
	/^https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\//;

const maxErrorMessageLength = 3_900;

/** Validates a Discord webhook URL without logging its credential-bearing path. */
export function isDiscordWebhookUrl(value: string) {
	return webhookPattern.test(value);
}

/** Delivers an Issue-created Alert through a Discord webhook. */
export async function sendDiscordIssueAlert(input: {
	webhookUrl: string;
	issue: Issue;
}) {
	const response = await fetch(input.webhookUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			embeds: [
				{
					title: `🚨 ${input.issue.errorType}`,
					description: `\`\`\`\n${input.issue.errorMessage
						.slice(0, maxErrorMessageLength)
						.replaceAll("```", "``\u200b`")}\n\`\`\``,
					color: 0xed3b3b,
					fields: [
						{
							name: "App",
							value: input.issue.appName,
							inline: true
						},
						{
							name: "Stage",
							value: input.issue.stageName,
							inline: true
						},
						{
							name: "Function",
							value:
								input.issue.functionName ??
								input.issue.logGroup,
							inline: false
						}
					],
					timestamp: input.issue.firstSeenAt
				}
			]
		})
	});
	if (!response.ok)
		throw new Error(`Discord webhook returned HTTP ${response.status}`);
}

/** Delivers a proof-of-connection message through a Discord webhook. */
export async function sendDiscordTestAlert(webhookUrl: string) {
	const response = await fetch(webhookUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			embeds: [
				{
					title: "SST Console test alert",
					description:
						"This message confirms SST Console can deliver alerts to this target.",
					color: 0x1976d2,
					timestamp: new Date().toISOString()
				}
			]
		})
	});
	if (!response.ok)
		throw new Error(`Discord webhook returned HTTP ${response.status}`);
}
