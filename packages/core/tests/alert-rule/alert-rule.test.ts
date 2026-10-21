import { beforeEach, describe, expect, it, vi } from "vitest";

const alertRuleCreate = vi.fn();
const alertRuleCreateGo = vi.fn();
const alertRuleByType = vi.fn();
const alertRuleByTypeGo = vi.fn();
const findDestination = vi.fn();
const deliver = vi.fn();

vi.mock("../../src/db", () => ({
	db: {
		entities: {
			alertRule: {
				create: alertRuleCreate,
				query: { byType: alertRuleByType }
			}
		}
	}
}));

vi.mock("../../src/notification-destination", () => ({
	find: findDestination
}));
vi.mock("../../src/notification", () => ({ deliver }));

const { alertRuleEntity } =
	await import("../../src/alert-rule/alert-rule.dynamo");
const { create, list, sendIssueNotifications } =
	await import("../../src/alert-rule");

const notificationDestinationId = "01K7VRAA8NH8CYTXZYGCGRBDDN";
const alertRule = {
	id: "01K7VRAA8NH8CYTXZYGCGRBDDP",
	type: "issue" as const,
	appName: "console",
	stageName: "prod",
	notificationDestinationIds: [notificationDestinationId],
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

describe("alert rules", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		alertRuleCreate.mockReturnValue({ go: alertRuleCreateGo });
		alertRuleByType.mockReturnValue({ go: alertRuleByTypeGo });
	});

	it("requires at least one notification destination", () => {
		expect(() =>
			create({ type: "issue", notificationDestinationIds: [] })
		).toThrow();
	});

	it("lists configured notification destination references", async () => {
		alertRuleByTypeGo.mockResolvedValue({ data: [alertRule] });
		await create({
			type: "issue",
			notificationDestinationIds: [notificationDestinationId]
		});
		await expect(list()).resolves.toEqual([alertRule]);
	});

	it("delivers matching Issue notifications using last seen time", async () => {
		const destination = {
			id: notificationDestinationId,
			channel: "discord"
		};
		alertRuleByTypeGo.mockResolvedValue({
			data: [
				alertRule,
				{
					...alertRule,
					id: "01K7VRAA8NH8CYTXZYGCGRBDDQ",
					stageName: "dev"
				}
			]
		});
		findDestination.mockResolvedValue(destination);

		await sendIssueNotifications(issue);

		expect(deliver).toHaveBeenCalledOnce();
		expect(deliver).toHaveBeenCalledWith(destination, {
			title: "🚨 Error",
			body: "Failure",
			severity: "error",
			occurredAt: issue.lastSeenAt,
			fields: [
				{ name: "App", value: "console", inline: true },
				{ name: "Stage", value: "prod", inline: true },
				{
					name: "Function",
					value: "/aws/lambda/example",
					inline: false
				}
			]
		});
	});

	it("does not deliver notifications for suppressed Issues", async () => {
		alertRuleByTypeGo.mockResolvedValue({ data: [alertRule] });

		await sendIssueNotifications({ ...issue, status: "suppressed" });

		expect(deliver).not.toHaveBeenCalled();
	});

	it("uses type index to list alert rules", () => {
		const params = alertRuleEntity.query
			.byType({})
			.params({ table: "ConsoleData" });
		expect(params.IndexName).toBe("entitiesByType");
	});
});
