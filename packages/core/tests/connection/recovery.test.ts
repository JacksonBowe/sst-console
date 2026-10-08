import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	listConnections,
	upsertConnection,
	queryAccounts,
	upsertAccount,
	getAccount
} = vi.hoisted(() => ({
	listConnections: vi.fn(),
	upsertConnection: vi.fn(),
	queryAccounts: vi.fn(),
	upsertAccount: vi.fn(),
	getAccount: vi.fn()
}));

vi.mock("../../src/connection/connection", () => ({
	list: listConnections,
	upsert: upsertConnection
}));
vi.mock("../../src/db", () => ({
	db: {
		entities: {
			account: {
				upsert: upsertAccount,
				get: getAccount,
				query: { byType: queryAccounts }
			}
		}
	}
}));
const { backupConnections, recover } =
	await import("../../src/connection/recovery");

describe("account recovery", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		upsertAccount.mockImplementation(() => ({
			ifNotExists: () => ({ go: vi.fn().mockResolvedValue(undefined) })
		}));
		getAccount.mockImplementation(({ accountId }) => ({
			go: vi.fn().mockResolvedValue({
				data: {
					accountId,
					region: "us-east-1",
					roleArn: `arn:aws:iam::${accountId}:role/SSTConsoleRole`,
					status: "connected",
					createdAt: "2026-01-01T00:00:00.000Z",
					updatedAt: "2026-01-01T00:00:00.000Z"
				}
			})
		}));
		queryAccounts.mockImplementation(() => ({
			go: vi.fn().mockResolvedValue({ data: [] })
		}));
		upsertConnection.mockResolvedValue(undefined);
	});

	it("copies existing account records into the durable registry", async () => {
		queryAccounts
			.mockImplementationOnce(() => ({
				go: vi.fn().mockResolvedValue({
					data: [
						{
							accountId: "111111111111",
							region: "us-east-1",
							roleArn:
								"arn:aws:iam::111111111111:role/SSTConsoleRole",
							status: "connected",
							createdAt: "2026-01-01T00:00:00.000Z",
							updatedAt: "2026-01-02T00:00:00.000Z"
						}
					]
				})
			}))
			.mockImplementationOnce(() => ({
				go: vi.fn().mockResolvedValue({ data: [] })
			}));

		await expect(backupConnections({})).resolves.toEqual({ backedUp: 1 });
		expect(upsertConnection).toHaveBeenCalledWith({
			accountId: "111111111111",
			region: "us-east-1",
			roleArn: "arn:aws:iam::111111111111:role/SSTConsoleRole",
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-01-02T00:00:00.000Z"
		});
	});

	it("restores every connection without syncing", async () => {
		listConnections.mockResolvedValue([
			{
				accountId: "111111111111",
				region: "us-east-1",
				roleArn: "arn:aws:iam::111111111111:role/SSTConsoleRole"
			},
			{
				accountId: "222222222222",
				region: "us-west-2",
				roleArn: "arn:aws:iam::222222222222:role/SSTConsoleRole"
			}
		]);
		const result = await recover({});

		expect(result).toMatchObject({
			recovered: 2,
			results: [
				{ accountId: "111111111111", status: "recovered" },
				{ accountId: "222222222222", status: "recovered" }
			]
		});
		expect(upsertAccount).toHaveBeenCalledTimes(2);
	});
});
