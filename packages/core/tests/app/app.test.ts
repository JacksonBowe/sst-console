import { beforeEach, describe, expect, it, vi } from "vitest";

const appCreate = vi.fn();
const appCreateGo = vi.fn();
const appGet = vi.fn();
const appGetGo = vi.fn();
const appByType = vi.fn();
const appByTypeGo = vi.fn();
const appPatch = vi.fn();
const appSet = vi.fn();
const appUpdateGo = vi.fn();
const stageCreate = vi.fn();
const stageCreateGo = vi.fn();
const stageGet = vi.fn();
const stageGetGo = vi.fn();
const stageByApp = vi.fn();
const stageByAppGo = vi.fn();
const stagePatch = vi.fn();
const stageSet = vi.fn();
const stageUpdateGo = vi.fn();
const stageDelete = vi.fn();
const stageDeleteGo = vi.fn();
const snapshot = vi.fn();
const snapshotGo = vi.fn();
const resource = vi.fn();
const resourceGo = vi.fn();

vi.mock("../../src/db", () => ({
	db: {
		entities: {
			app: {
				create: appCreate,
				get: appGet,
				patch: appPatch,
				query: { byType: appByType }
			},
			stage: {
				create: stageCreate,
				get: stageGet,
				patch: stagePatch,
				delete: stageDelete,
				query: { stage: stageByApp }
			},
			stateSnapshot: { query: { snapshot } },
			resource: { query: { resource } }
		}
	}
}));

const App = await import("../../src/app");

const app = {
	appName: "console",
	createdAt: "2026-10-07T00:00:00.000Z",
	updatedAt: "2026-10-07T00:00:00.000Z"
};
const stage = {
	appName: app.appName,
	stageName: "dev",
	accountId: "123456789012",
	region: "ap-southeast-2",
	issueMonitoringEnabled: false,
	createdAt: app.createdAt,
	updatedAt: app.updatedAt
};

describe("App", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		appCreate.mockReturnValue({ go: appCreateGo });
		appGet.mockReturnValue({ go: appGetGo });
		appByType.mockReturnValue({ go: appByTypeGo });
		appPatch.mockReturnValue({ set: appSet });
		appSet.mockReturnValue({ go: appUpdateGo });
		stageCreate.mockReturnValue({ go: stageCreateGo });
		stageGet.mockReturnValue({ go: stageGetGo });
		stageByApp.mockReturnValue({ go: stageByAppGo });
		stagePatch.mockReturnValue({ set: stageSet });
		stageSet.mockReturnValue({ go: stageUpdateGo });
		stageDelete.mockReturnValue({ go: stageDeleteGo });
		snapshot.mockReturnValue({ go: snapshotGo });
		resource.mockReturnValue({ go: resourceGo });
	});

	it("creates, updates, lists, and gets Apps", async () => {
		appGetGo.mockResolvedValue({ data: app });
		appByTypeGo.mockResolvedValue({ data: [app] });

		await App.create(app);
		await App.update({ appName: app.appName, updatedAt: app.updatedAt });
		await expect(App.list({})).resolves.toEqual([app]);
		await expect(App.get({ appName: app.appName })).resolves.toEqual(app);

		expect(appCreate).toHaveBeenCalledWith(app);
		expect(appPatch).toHaveBeenCalledWith({ appName: app.appName });
		expect(appSet).toHaveBeenCalledWith({ updatedAt: app.updatedAt });
	});

	it("summarizes Apps and manages Stages", async () => {
		appGetGo.mockResolvedValue({ data: app });
		stageGetGo.mockResolvedValue({ data: stage });
		stageByAppGo.mockResolvedValue({ data: [stage] });
		snapshotGo.mockResolvedValue({ data: [{ snapshotId: "snapshot" }] });
		resourceGo.mockResolvedValue({ data: [{ resourceId: "bucket" }] });

		await App.Stage.create(stage);
		await App.Stage.update({
			appName: stage.appName,
			stageName: stage.stageName,
			issueMonitoringEnabled: true
		});
		await expect(App.Stage.list({ appName: app.appName })).resolves.toEqual(
			[stage]
		);
		await expect(
			App.Stage.get({ appName: app.appName, stageName: stage.stageName })
		).resolves.toEqual(stage);
		await expect(App.summary({ appName: app.appName })).resolves.toEqual({
			...app,
			stages: [
				{
					stageName: stage.stageName,
					accountId: stage.accountId,
					region: stage.region,
					issueMonitoringEnabled: false,
					createdAt: stage.createdAt,
					updatedAt: stage.updatedAt,
					latestSnapshot: { snapshotId: "snapshot" },
					resourceCount: 1
				}
			]
		});
		await expect(App.list({ summaries: true })).resolves.toEqual([
			{
				...app,
				stages: [
					{
						stageName: stage.stageName,
						accountId: stage.accountId,
						region: stage.region,
						issueMonitoringEnabled: false,
						createdAt: stage.createdAt,
						updatedAt: stage.updatedAt,
						latestSnapshot: { snapshotId: "snapshot" },
						resourceCount: 1
					}
				]
			}
		]);
		await App.Stage.remove({
			appName: stage.appName,
			stageName: stage.stageName
		});

		expect(stageCreate).toHaveBeenCalledWith(stage);
		expect(stageSet).toHaveBeenCalledWith({ issueMonitoringEnabled: true });
		expect(stageDelete).toHaveBeenCalledWith({
			appName: stage.appName,
			stageName: stage.stageName
		});
	});

	it("throws domain error for missing App projections", async () => {
		appGetGo.mockResolvedValue({ data: null });

		await expect(App.get({ appName: app.appName })).rejects.toMatchObject({
			code: "app.not_found",
			status: 404
		});
	});

	it("throws domain error for missing Stage projections", async () => {
		stageGetGo.mockResolvedValue({ data: null });

		await expect(
			App.Stage.get({
				appName: stage.appName,
				stageName: stage.stageName
			})
		).rejects.toMatchObject({ code: "app.stage_not_found", status: 404 });
	});
});
