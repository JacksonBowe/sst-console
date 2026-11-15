import { beforeEach, describe, expect, it, vi } from "vitest";

const alertRuleByType = vi.fn();
const alertRuleByTypeGo = vi.fn();
const destinationByType = vi.fn();
const destinationByTypeGo = vi.fn();
const destinationDelete = vi.fn();
const destinationDeleteGo = vi.fn();

vi.mock("../../src/db", () => ({
	db: {
		entities: {
			alertRule: { query: { byType: alertRuleByType } },
			notificationDestination: {
				query: { byType: destinationByType },
				delete: destinationDelete
			}
		}
	}
}));

vi.mock("../../src/integration/discord", () => ({
	isDiscordWebhookUrl: () => true
}));
const { list, remove } = await import("../../src/notification-destination");

const notificationDestinationId = "01K7VRAA8NH8CYTXZYGCGRBDDN";
const destination = {
	id: notificationDestinationId,
	name: "Mafia Discord #alerts",
	channel: "discord" as const,
	channelConfig: { webhookUrl: "https://discord.com/api/webhooks/123/token" },
	createdAt: "2026-10-13T00:00:00.000Z",
	updatedAt: "2026-10-13T00:00:00.000Z"
};

describe("notification destinations", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		alertRuleByType.mockReturnValue({ go: alertRuleByTypeGo });
		destinationByType.mockReturnValue({ go: destinationByTypeGo });
		destinationDelete.mockReturnValue({ go: destinationDeleteGo });
	});

	it("does not expose webhook URLs in destination lists", async () => {
		destinationByTypeGo.mockResolvedValue({ data: [destination] });

		await expect(list()).resolves.toEqual([
			expect.objectContaining({
				id: notificationDestinationId,
				name: "Mafia Discord #alerts",
				configured: true
			})
		]);
		expect(await list()).not.toContainEqual(
			expect.objectContaining({
				channelConfig: destination.channelConfig
			})
		);
	});

	it("rejects deletion while an alert rule references destination", async () => {
		alertRuleByTypeGo.mockResolvedValue({
			data: [{ notificationDestinationIds: [notificationDestinationId] }]
		});

		await expect(
			remove({ id: notificationDestinationId })
		).rejects.toMatchObject({
			code: "notification_destination_in_use"
		});
		expect(destinationDelete).not.toHaveBeenCalled();
	});
});
