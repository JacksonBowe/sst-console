import { beforeEach, describe, expect, it, vi } from "vitest";

const alertCreate = vi.fn();
const alertCreateGo = vi.fn();
const alertByType = vi.fn();
const alertByTypeGo = vi.fn();
const findTarget = vi.fn();
const sendTargetIssueAlert = vi.fn();

vi.mock("../../src/db", () => ({
	db: {
		entities: {
			alert: {
				create: alertCreate,
				query: { byType: alertByType }
			}
		}
	}
}));

vi.mock("../../src/alert-target", () => ({
	find: findTarget,
	sendIssueAlert: sendTargetIssueAlert
}));

const { alertEntity } = await import("../../src/alert/alert.dynamo");
const { create, list, sendIssueAlert } = await import("../../src/alert");

const targetId = "01K7VRAA8NH8CYTXZYGCGRBDDN";
const alert = {
	id: "01K7VRAA8NH8CYTXZYGCGRBDDP",
	type: "issue" as const,
	appName: "console",
	stageName: "prod",
	targetIds: [targetId],
	createdAt: "2026-10-13T00:00:00.000Z",
	updatedAt: "2026-10-13T00:00:00.000Z"
};
const issue = {
	appName: "console",
	stageName: "prod",
	fingerprint: "fingerprint",
	accountId: "123456789012",
	region: "ap-southeast-2",
	errorType: "Error",
	errorMessage: "Failure",
	status: "open" as const,
	statusUpdatedAt: "2026-10-13T00:00:00.000Z",
	count: 1,
	firstSeenAt: "2026-10-13T00:00:00.000Z",
	lastSeenAt: "2026-10-13T00:00:00.000Z",
	logGroup: "/aws/lambda/example",
	logStream: "stream",
	logTimestamp: 1
};

describe("alerts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		alertCreate.mockReturnValue({ go: alertCreateGo });
		alertByType.mockReturnValue({ go: alertByTypeGo });
	});

	it("requires at least one Alert target", () => {
		expect(() => create({ type: "issue", targetIds: [] })).toThrow();
	});

	it("lists configured target references", async () => {
		alertByTypeGo.mockResolvedValue({ data: [alert] });
		await create({ type: "issue", targetIds: [targetId] });
		await expect(list()).resolves.toEqual([alert]);
	});

	it("delivers matching Alerts to their configured targets", async () => {
		const target = { id: targetId, channel: "discord" };
		alertByTypeGo.mockResolvedValue({
			data: [
				alert,
				{ ...alert, id: "01K7VRAA8NH8CYTXZYGCGRBDDQ", stageName: "dev" }
			]
		});
		findTarget.mockResolvedValue(target);

		await sendIssueAlert(issue);

		expect(sendTargetIssueAlert).toHaveBeenCalledOnce();
		expect(sendTargetIssueAlert).toHaveBeenCalledWith(target, issue);
	});

	it("uses the type index to list Alert configuration", () => {
		const params = alertEntity.query
			.byType({})
			.params({ table: "ConsoleData" });
		expect(params.IndexName).toBe("entitiesByType");
	});
});
