import { beforeEach, describe, expect, it, vi } from "vitest";

const identityGet = vi.fn();
const identityGetGo = vi.fn();
const userCreate = vi.fn();
const identityCreate = vi.fn();
const transactionWrite = vi.fn();
const transactionGo = vi.fn();

vi.mock("../../src/db", () => ({
	db: {
		entities: {
			userIdentity: { get: identityGet }
		},
		transaction: { write: transactionWrite }
	}
}));

const { create, exchangeCognitoSub } = await import("../../src/user/user");

const input = {
	cognitoSub: "cognito-sub",
	email: "person@example.com",
	cognitoStatus: "FORCE_CHANGE_PASSWORD" as const,
	cognitoEnabled: true
};
const userId = "01ARZ3NDEKTSV4RRFFQ69G5FAV";

describe("user", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		identityGet.mockImplementation(() => ({ go: identityGetGo }));
		userCreate.mockImplementation(() => ({ commit: vi.fn() }));
		identityCreate.mockImplementation(() => ({ commit: vi.fn() }));
		transactionWrite.mockImplementation(callback => {
			callback({
				user: { create: userCreate },
				userIdentity: { create: identityCreate }
			});
			return { go: transactionGo };
		});
	});

	it("exchanges a Cognito subject for its native user ID", async () => {
		identityGetGo.mockResolvedValue({ data: { userId } });

		await expect(
			exchangeCognitoSub({ cognitoSub: input.cognitoSub })
		).resolves.toBe(userId);
		expect(identityGet).toHaveBeenCalledWith({
			cognitoSub: input.cognitoSub
		});
	});

	it("creates native user and Cognito identity together", async () => {
		transactionGo.mockResolvedValue({ canceled: false });

		const result = await create(input);

		expect(result.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
		expect(userCreate).toHaveBeenCalledWith(
			expect.objectContaining({ ...input, id: result.id })
		);
		expect(identityCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				cognitoSub: input.cognitoSub,
				userId: result.id
			})
		);
	});

	it("rejects a concurrent identity create", async () => {
		transactionGo.mockResolvedValue({ canceled: true });

		await expect(create(input)).rejects.toMatchObject({
			code: "user.exists"
		});
	});
});
