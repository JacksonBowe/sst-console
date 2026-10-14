import { beforeEach, describe, expect, it, vi } from "vitest";

const alertByType = vi.fn();
const alertByTypeGo = vi.fn();
const targetByType = vi.fn();
const targetByTypeGo = vi.fn();
const targetDelete = vi.fn();
const targetDeleteGo = vi.fn();
const targetGet = vi.fn();
const targetGetGo = vi.fn();
const sendDiscordTestAlert = vi.fn();

vi.mock("../../src/db", () => ({
	db: {
		entities: {
			alert: { query: { byType: alertByType } },
			alertTarget: {
				query: { byType: targetByType },
				delete: targetDelete,
				get: targetGet
			}
		}
	}
}));

vi.mock("../../src/integration/discord", () => ({
	isDiscordWebhookUrl: () => true,
	sendDiscordTestAlert
}));

const { alertTargetEntity } =
	await import("../../src/alert-target/alert-target.dynamo");
const { list, remove, test } = await import("../../src/alert-target");

const targetId = "01K7VRAA8NH8CYTXZYGCGRBDDN";
const target = {
	id: targetId,
	name: "Mafia Discord #alerts",
	channel: "discord" as const,
	channelConfig: { webhookUrl: "https://discord.com/api/webhooks/123/token" },
	createdAt: "2026-10-13T00:00:00.000Z",
	updatedAt: "2026-10-13T00:00:00.000Z"
};

describe("alert targets", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		alertByType.mockReturnValue({ go: alertByTypeGo });
		targetByType.mockReturnValue({ go: targetByTypeGo });
		targetDelete.mockReturnValue({ go: targetDeleteGo });
		targetGet.mockReturnValue({ go: targetGetGo });
	});

	it("does not expose webhook URLs in target lists", async () => {
		targetByTypeGo.mockResolvedValue({ data: [target] });

		await expect(list()).resolves.toEqual([
			expect.objectContaining({
				id: targetId,
				name: "Mafia Discord #alerts",
				configured: true
			})
		]);
		expect(await list()).not.toContainEqual(
			expect.objectContaining({ channelConfig: target.channelConfig })
		);
	});

	it("rejects deletion while an Alert references the target", async () => {
		alertByTypeGo.mockResolvedValue({ data: [{ targetIds: [targetId] }] });

		await expect(remove({ id: targetId })).rejects.toMatchObject({
			code: "alert_target_in_use"
		});
		expect(targetDelete).not.toHaveBeenCalled();
	});

	it("sends a proof-of-connection alert", async () => {
		targetGetGo.mockResolvedValue({ data: target });

		await test({ id: targetId });

		expect(sendDiscordTestAlert).toHaveBeenCalledWith(
			target.channelConfig.webhookUrl
		);
	});

	it("uses the type index to list Alert targets", () => {
		const params = alertTargetEntity.query
			.byType({})
			.params({ table: "ConsoleData" });
		expect(params.IndexName).toBe("entitiesByType");
	});
});
