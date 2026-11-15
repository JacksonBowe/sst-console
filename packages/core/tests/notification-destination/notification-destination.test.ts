import { beforeEach, describe, expect, it, vi } from "vitest";
import { notificationDestinationEntity } from "../../src/notification-destination/notification-destination.dynamo";

const alertRuleByType = vi.fn();
const alertRuleByTypeGo = vi.fn();
const destinationByType = vi.fn();
const destinationByTypeGo = vi.fn();
const destinationDelete = vi.fn();
const destinationDeleteGo = vi.fn();
const destinationPatch = vi.fn();
const destinationSet = vi.fn();
const destinationPatchGo = vi.fn();
const destinationGet = vi.fn();
const destinationGetGo = vi.fn();

vi.mock("../../src/db", () => ({
	db: {
		entities: {
			alertRule: { query: { byType: alertRuleByType } },
			notificationDestination: {
				query: { byType: destinationByType },
				delete: destinationDelete,
				patch: destinationPatch,
				get: destinationGet
			}
		}
	}
}));

const {
	list,
	remove,
	update,
	NotificationDestinationInputSchema,
	NotificationDestinationUpdateSchema
} = await import("../../src/notification-destination");

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
		destinationPatch.mockReturnValue({ set: destinationSet });
		destinationSet.mockReturnValue({ go: destinationPatchGo });
		destinationGet.mockReturnValue({ go: destinationGetGo });
		destinationGetGo.mockResolvedValue({ data: destination });
	});

	it("preserves the webhook on name-only updates and never returns it", async () => {
		const result = await update({
			id: notificationDestinationId,
			name: "New name"
		});
		expect(destinationSet).toHaveBeenCalledWith({
			name: "New name",
			updatedAt: expect.any(String)
		});
		expect(result).not.toHaveProperty("channelConfig");
	});

	it("updates the webhook when a replacement is supplied", async () => {
		const channelConfig = {
			webhookUrl: "https://discord.com/api/webhooks/456/new-token"
		};
		await update({
			id: notificationDestinationId,
			name: "New name",
			channelConfig
		});
		expect(destinationSet).toHaveBeenCalledWith({
			name: "New name",
			channelConfig,
			updatedAt: expect.any(String)
		});
	});

	it("requires a webhook on create but not on update", () => {
		expect(
			NotificationDestinationInputSchema.safeParse({
				name: "Name",
				channel: "discord"
			}).success
		).toBe(false);
		expect(
			NotificationDestinationUpdateSchema.safeParse({ name: "Name" })
				.success
		).toBe(true);
		expect(
			NotificationDestinationUpdateSchema.safeParse({
				name: "Name",
				channelConfig: { webhookUrl: "invalid" }
			}).success
		).toBe(false);
	});

	it("generates a name-only patch without writing the credential", () => {
		const params = notificationDestinationEntity
			.patch({ id: notificationDestinationId })
			.set({ name: "New name", updatedAt: "2026-10-14T00:00:00.000Z" })
			.params({ table: "test" });
		expect(
			Object.values(params.ExpressionAttributeNames ?? {})
		).not.toContain("channelConfig");
		expect(params.ConditionExpression).toBeTruthy();
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
