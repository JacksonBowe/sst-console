import { beforeEach, describe, expect, it, vi } from "vitest";

const accountUpsert = vi.fn();
const accountIfNotExists = vi.fn();
const accountCreateGo = vi.fn();
const accountGet = vi.fn();
const accountGetGo = vi.fn();
const accountPatch = vi.fn();
const accountSet = vi.fn();
const accountUpdateGo = vi.fn();
const accountDelete = vi.fn();
const accountDeleteGo = vi.fn();
const accountByStatus = vi.fn();
const accountByStatusGo = vi.fn();

vi.mock("../../src/db", () => ({
	db: {
		entities: {
			account: {
				upsert: accountUpsert,
				get: accountGet,
				patch: accountPatch,
				delete: accountDelete,
				query: { byStatus: accountByStatus }
			}
		}
	}
}));

const Account = await import("../../src/account/account");

const account = {
	accountId: "123456789012",
	region: "ap-southeast-2",
	roleArn: "arn:aws:iam::123456789012:role/SSTConsoleRole",
	status: "connected" as const,
	createdAt: "2026-10-07T00:00:00.000Z",
	updatedAt: "2026-10-07T00:00:00.000Z"
};

describe("Account", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		accountUpsert.mockReturnValue({ ifNotExists: accountIfNotExists });
		accountIfNotExists.mockReturnValue({ go: accountCreateGo });
		accountGet.mockReturnValue({ go: accountGetGo });
		accountPatch.mockReturnValue({ set: accountSet });
		accountSet.mockReturnValue({ go: accountUpdateGo });
		accountDelete.mockReturnValue({ go: accountDeleteGo });
		accountByStatus.mockReturnValue({ go: accountByStatusGo });
	});

	it("creates, finds, updates, removes, and lists Accounts", async () => {
		accountGetGo.mockResolvedValue({ data: account });
		accountByStatusGo.mockResolvedValue({ data: [account] });

		await Account.create(account);
		await expect(
			Account.find({ accountId: account.accountId })
		).resolves.toEqual(account);
		await expect(
			Account.get({ accountId: account.accountId })
		).resolves.toEqual(account);
		await Account.update({
			accountId: account.accountId,
			status: "disconnected"
		});
		await Account.remove({ accountId: account.accountId });
		await expect(Account.list()).resolves.toEqual([account, account]);

		expect(accountUpsert).toHaveBeenCalledWith({
			accountId: account.accountId,
			region: account.region,
			roleArn: account.roleArn,
			status: account.status,
			updatedAt: account.updatedAt
		});
		expect(accountIfNotExists).toHaveBeenCalledWith({
			createdAt: account.createdAt
		});
		expect(accountPatch).toHaveBeenCalledWith({
			accountId: account.accountId
		});
		expect(accountSet).toHaveBeenCalledWith({ status: "disconnected" });
		expect(accountDelete).toHaveBeenCalledWith({
			accountId: account.accountId
		});
	});

	it("throws domain error for a missing Account", async () => {
		accountGetGo.mockResolvedValue({ data: null });

		await expect(
			Account.get({ accountId: account.accountId })
		).rejects.toMatchObject({
			code: "account_not_found",
			status: 400
		});
	});
});
