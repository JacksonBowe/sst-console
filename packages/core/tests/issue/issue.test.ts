import { beforeEach, describe, expect, it, vi } from "vitest";

const issueCreate = vi.fn();
const issueCreateGo = vi.fn();
const issueGet = vi.fn();
const issueGetGo = vi.fn();
const issueByStage = vi.fn();
const issueByStageGo = vi.fn();
const issuePatch = vi.fn();
const issueSet = vi.fn();
const issueAdd = vi.fn();
const issueUpdateGo = vi.fn();
const issueDelete = vi.fn();
const issueDeleteGo = vi.fn();
const appByName = vi.fn();
const appByNameGo = vi.fn();
const stageByStage = vi.fn();
const stageByStageGo = vi.fn();

vi.mock("../../src/db", () => ({
	db: {
		entities: {
			issue: {
				create: issueCreate,
				get: issueGet,
				query: { stage: issueByStage },
				patch: issuePatch,
				delete: issueDelete
			},
			app: { query: { byName: appByName } },
			stage: { query: { stage: stageByStage } }
		}
	}
}));

const { create, get, list, purge, remove, update } =
	await import("../../src/issue/issue");

const issue = {
	appName: "console",
	stageName: "dev",
	fingerprint: "fingerprint",
	error: "ConsoleError",
	message: "Error message",
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
		issueByStage.mockReturnValue({ go: issueByStageGo });
		issueSet.mockReturnValue({ add: issueAdd, go: issueUpdateGo });
		issueAdd.mockReturnValue({ go: issueUpdateGo });
		issuePatch.mockReturnValue({ set: issueSet });
		issueDelete.mockReturnValue({ go: issueDeleteGo });
		appByName.mockReturnValue({ go: appByNameGo });
		stageByStage.mockReturnValue({ go: stageByStageGo });
	});

	it("creates, gets, lists, and removes Issues", async () => {
		issueGetGo.mockResolvedValue({ data: issue });
		issueByStageGo.mockResolvedValue({ data: [issue] });

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
		expect(issueByStage).toHaveBeenCalledWith({
			appName: issue.appName,
			stageName: issue.stageName
		});
		expect(issueDelete).toHaveBeenCalledWith({
			appName: issue.appName,
			stageName: issue.stageName,
			fingerprint: issue.fingerprint
		});
	});

	it("updates fields and atomically increments count", async () => {
		await update({
			appName: issue.appName,
			stageName: issue.stageName,
			fingerprint: issue.fingerprint,
			countDelta: 1,
			resolvedAt: null
		});

		expect(issuePatch).toHaveBeenCalledWith({
			appName: issue.appName,
			stageName: issue.stageName,
			fingerprint: issue.fingerprint
		});
		expect(issueSet).toHaveBeenCalledWith({ resolvedAt: undefined });
		expect(issueAdd).toHaveBeenCalledWith({ count: 1 });
	});

	it("purges every stage Issue", async () => {
		appByNameGo.mockResolvedValue({ data: [{ appName: issue.appName }] });
		stageByStageGo.mockResolvedValue({
			data: [{ appName: issue.appName, stageName: issue.stageName }]
		});
		issueByStageGo.mockResolvedValue({ data: [issue] });

		await purge();

		expect(issueDelete).toHaveBeenCalledWith({
			appName: issue.appName,
			stageName: issue.stageName,
			fingerprint: issue.fingerprint
		});
	});
});
