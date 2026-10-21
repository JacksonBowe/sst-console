import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	issueEntity,
	issueIngressEventEntity
} from "../../src/issue/issue.dynamo";

const issueCreate = vi.fn();
const issueCreateGo = vi.fn();
const issueGet = vi.fn();
const issueGetGo = vi.fn();
const issueByType = vi.fn();
const issueBegins = vi.fn();
const issueByTypeGo = vi.fn();
const issuePatch = vi.fn();
const issueSet = vi.fn();
const issueAdd = vi.fn();
const issueUpdateGo = vi.fn();
const issueDelete = vi.fn();
const issueDeleteGo = vi.fn();
const ingressEventByType = vi.fn();
const ingressEventByTypeGo = vi.fn();
const ingressEventGet = vi.fn();
const ingressEventGetGo = vi.fn();
const ingressEventDelete = vi.fn();
const ingressEventDeleteGo = vi.fn();
const transactionWrite = vi.fn();
const transactionGo = vi.fn();
const transactionIssueCreate = vi.fn();
const transactionIngressEventCreate = vi.fn();

vi.mock("../../src/db", () => ({
	db: {
		entities: {
			issue: {
				create: issueCreate,
				get: issueGet,
				query: { byType: issueByType },
				patch: issuePatch,
				delete: issueDelete
			},
			issueIngressEvent: {
				get: ingressEventGet,
				query: { byType: ingressEventByType },
				delete: ingressEventDelete
			}
		},
		transaction: { write: transactionWrite }
	}
}));

const { create, get, list, purge, recordOccurrence, remove, update } =
	await import("../../src/issue/issue");

const issue = {
	appName: "console",
	stageName: "dev",
	fingerprint: "fingerprint",
	accountId: "123456789012",
	region: "ap-southeast-2",
	functionArn: "arn:aws:lambda:ap-southeast-2:123456789012:function:example",
	functionName: "example",
	errorType: "ConsoleError",
	errorMessage: "Error message",
	status: "open" as const,
	statusUpdatedAt: "2026-10-07T00:00:00.000Z",
	count: 1,
	firstSeenAt: "2026-10-07T00:00:00.000Z",
	lastSeenAt: "2026-10-07T00:00:00.000Z",
	logGroup: "/aws/lambda/example",
	logStream: "stream",
	logTimestamp: 1
};

describe("issue", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		issueCreate.mockReturnValue({ go: issueCreateGo });
		issueGet.mockReturnValue({ go: issueGetGo });
		issueByType.mockReturnValue({ go: issueByTypeGo, begins: issueBegins });
		issueBegins.mockReturnValue({ go: issueByTypeGo });
		issueSet.mockReturnValue({ add: issueAdd, go: issueUpdateGo });
		issueAdd.mockReturnValue({ go: issueUpdateGo });
		issuePatch.mockReturnValue({ set: issueSet });
		issueDelete.mockReturnValue({ go: issueDeleteGo });
		ingressEventGet.mockReturnValue({ go: ingressEventGetGo });
		ingressEventByType.mockReturnValue({ go: ingressEventByTypeGo });
		ingressEventDelete.mockReturnValue({ go: ingressEventDeleteGo });
		transactionIssueCreate.mockReturnValue({ commit: vi.fn() });
		transactionIngressEventCreate.mockReturnValue({ commit: vi.fn() });
		transactionWrite.mockImplementation(callback => {
			callback({
				issue: { create: transactionIssueCreate },
				issueIngressEvent: { create: transactionIngressEventCreate }
			});
			return { go: transactionGo };
		});
	});

	it("creates, gets, lists, and removes Issues", async () => {
		issueGetGo.mockResolvedValue({ data: issue });
		issueByTypeGo.mockResolvedValue({ data: [issue] });

		await create(issue);
		await expect(get(issue)).resolves.toEqual(issue);
		await expect(list(issue)).resolves.toEqual([issue]);
		await remove(issue);

		expect(issueCreate).toHaveBeenCalledWith(issue);
		expect(issueGet).toHaveBeenCalledWith({
			appName: issue.appName,
			stageName: issue.stageName,
			fingerprint: issue.fingerprint
		});
		expect(issueByType).toHaveBeenCalledWith({});
		expect(issueBegins).toHaveBeenCalledWith({
			appName: issue.appName,
			stageName: issue.stageName
		});
		expect(issueDelete).toHaveBeenCalledWith({
			appName: issue.appName,
			stageName: issue.stageName,
			fingerprint: issue.fingerprint
		});
	});

	it("filters status after querying one App", async () => {
		issueByTypeGo.mockResolvedValue({
			data: [
				issue,
				{ ...issue, fingerprint: "resolved", status: "resolved" }
			]
		});

		await expect(
			list({ appName: "console", status: "open" })
		).resolves.toEqual([issue]);
		expect(issueBegins).toHaveBeenCalledWith({ appName: "console" });
	});

	it("uses the type index for dashboard Issue reads", () => {
		const params = issueEntity.query
			.byType({})
			.params({ table: "ConsoleData" });
		expect(params.IndexName).toBe("entitiesByType");
		expect(params.KeyConditionExpression).toContain("#pk");
	});

	it("uses sort-key prefixes for App and Stage reads", () => {
		const params = issueEntity.query
			.byType({})
			.begins({ appName: "console", stageName: "dev" })
			.params({ table: "ConsoleData" });
		expect(params.KeyConditionExpression).toContain("begins_with");
	});

	it("uses a Stage key for retained ingress events", () => {
		const params = issueIngressEventEntity
			.get({
				appName: "console",
				stageName: "dev",
				sourceKey: "a".repeat(64),
				eventId: "event"
			})
			.params({ table: "ConsoleData" });
		expect(params.Key).toEqual(
			expect.objectContaining({
				pk: "APP#console#STAGE#dev",
				sk: expect.stringContaining("ISSUE_INGRESS_EVENT")
			})
		);
	});

	it("updates fields and atomically increments count", async () => {
		await update({
			appName: issue.appName,
			stageName: issue.stageName,
			fingerprint: issue.fingerprint,
			countDelta: 1,
			status: "resolved"
		});

		expect(issuePatch).toHaveBeenCalledWith({
			appName: issue.appName,
			stageName: issue.stageName,
			fingerprint: issue.fingerprint
		});
		expect(issueSet).toHaveBeenCalledWith({ status: "resolved" });
		expect(issueAdd).toHaveBeenCalledWith({ count: 1 });
	});

	it("creates an ingress marker and Issue in one transaction", async () => {
		ingressEventGetGo.mockResolvedValue({ data: null });
		issueGetGo.mockResolvedValueOnce({ data: null }).mockResolvedValue({
			data: issue
		});
		transactionGo.mockResolvedValue({ canceled: false });

		await expect(
			recordOccurrence({
				issue,
				sourceKey: "a".repeat(64),
				eventId: "event"
			})
		).resolves.toEqual({
			outcome: "created",
			issue
		});

		expect(transactionIngressEventCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				appName: issue.appName,
				stageName: issue.stageName,
				sourceKey: "a".repeat(64),
				eventId: "event",
				ttl: expect.any(Number)
			})
		);
		expect(transactionIssueCreate).toHaveBeenCalledWith(issue);
	});

	it("does not mutate an Issue when its ingress marker exists", async () => {
		ingressEventGetGo.mockResolvedValue({
			data: {
				appName: issue.appName,
				stageName: issue.stageName,
				sourceKey: "a".repeat(64),
				eventId: "event",
				ttl: 1
			}
		});

		await expect(
			recordOccurrence({
				issue,
				sourceKey: "a".repeat(64),
				eventId: "event"
			})
		).resolves.toEqual({ outcome: "duplicate" });
		expect(transactionWrite).not.toHaveBeenCalled();
	});

	it("purges every stage Issue", async () => {
		issueByTypeGo.mockResolvedValue({ data: [issue] });
		ingressEventByTypeGo.mockResolvedValue({ data: [] });

		await purge();

		expect(issueDelete).toHaveBeenCalledWith({
			appName: issue.appName,
			stageName: issue.stageName,
			fingerprint: issue.fingerprint
		});
	});
});
