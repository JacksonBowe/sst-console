import { beforeEach, describe, expect, it, vi } from "vitest";

const subscriptionCreate = vi.fn();
const subscriptionCreateGo = vi.fn();
const subscriptionByStage = vi.fn();
const subscriptionByStageGo = vi.fn();
const subscriptionPatch = vi.fn();
const subscriptionSet = vi.fn();
const subscriptionUpdateGo = vi.fn();
const subscriptionUpsert = vi.fn();
const subscriptionUpsertGo = vi.fn();
const subscriberUpsert = vi.fn();
const subscriberUpsertGo = vi.fn();

vi.mock("../../src/db", () => ({
	db: {
		entities: {
			issueSubscription: {
				create: subscriptionCreate,
				query: { stage: subscriptionByStage },
				patch: subscriptionPatch,
				upsert: subscriptionUpsert
			},
			issueSubscriber: { upsert: subscriberUpsert }
		}
	}
}));

const { create, list, update, upsert, upsertSubscriber } =
	await import("../../src/issue/issue.subscription");

const subscription = {
	appName: "console",
	stageName: "dev",
	accountId: "123456789012",
	region: "ap-southeast-2",
	logGroup: "/aws/lambda/example",
	filterName: "sst#filter",
	status: "pending" as const,
	updatedAt: "2026-10-07T00:00:00.000Z"
};

describe("Issue subscription", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		subscriptionCreate.mockReturnValue({ go: subscriptionCreateGo });
		subscriptionByStage.mockReturnValue({ go: subscriptionByStageGo });
		subscriptionSet.mockReturnValue({ go: subscriptionUpdateGo });
		subscriptionPatch.mockReturnValue({ set: subscriptionSet });
		subscriptionUpsert.mockReturnValue({ go: subscriptionUpsertGo });
		subscriberUpsert.mockReturnValue({ go: subscriberUpsertGo });
	});

	it("creates and lists stage subscriptions", async () => {
		subscriptionByStageGo.mockResolvedValue({ data: [subscription] });

		await create(subscription);
		await expect(list(subscription)).resolves.toEqual([subscription]);

		expect(subscriptionCreate).toHaveBeenCalledWith(subscription);
		expect(subscriptionByStage).toHaveBeenCalledWith({
			appName: subscription.appName,
			stageName: subscription.stageName
		});
	});

	it("updates and upserts subscription state", async () => {
		await update({
			appName: subscription.appName,
			stageName: subscription.stageName,
			region: subscription.region,
			logGroup: subscription.logGroup,
			status: "attached"
		});
		await upsert(subscription);

		expect(subscriptionPatch).toHaveBeenCalledWith({
			appName: subscription.appName,
			stageName: subscription.stageName,
			region: subscription.region,
			logGroup: subscription.logGroup
		});
		expect(subscriptionSet).toHaveBeenCalledWith({ status: "attached" });
		expect(subscriptionUpsert).toHaveBeenCalledWith(subscription);
	});

	it("upserts regional subscriber state", async () => {
		const subscriber = {
			accountId: subscription.accountId,
			region: subscription.region,
			stackName: "SSTConsoleIssueSubscriber-example",
			status: "ready" as const,
			updatedAt: subscription.updatedAt
		};

		await upsertSubscriber(subscriber);

		expect(subscriberUpsert).toHaveBeenCalledWith(subscriber);
	});
});
