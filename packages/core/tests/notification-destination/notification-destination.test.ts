import { beforeEach, describe, expect, it, vi } from "vitest";

const alertRuleByType = vi.fn();
const alertRuleByTypeGo = vi.fn();
const destinationByType = vi.fn();
const destinationByTypeGo = vi.fn();
const destinationDelete = vi.fn();
const destinationDeleteGo = vi.fn();
const destinationGet = vi.fn();
const destinationGetGo = vi.fn();
const deliver = vi.fn();
const testMessage = vi.fn();

vi.mock("../../src/db", () => ({
	db: {
		entities: {
			alertRule: { query: { byType: alertRuleByType } },
			notificationDestination: {
				query: { byType: destinationByType },
				delete: destinationDelete,
				get: destinationGet
			}
		}
	}
}));

vi.mock("../../src/integration/discord", () => ({
	isDiscordWebhookUrl: () => true
}));
vi.mock("../../src/notification", () => ({ deliver, testMessage }));

const { notificationDestinationEntity } =
	await import("../../src/notification-destination/notification-destination.dynamo");
const { list, remove, test } =
	await import("../../src/notification-destination");

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
		destinationGet.mockReturnValue({ go: destinationGetGo });
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

	it("sends generic test notification", async () => {
		destinationGetGo.mockResolvedValue({ data: destination });
		const notification = { title: "Test" };
		testMessage.mockReturnValue(notification);

		await test({ id: notificationDestinationId });

		expect(deliver).toHaveBeenCalledWith(destination, notification);
	});

	it("uses type index to list notification destinations", () => {
		const params = notificationDestinationEntity.query
			.byType({})
			.params({ table: "ConsoleData" });
		expect(params.IndexName).toBe("entitiesByType");
	});
});
