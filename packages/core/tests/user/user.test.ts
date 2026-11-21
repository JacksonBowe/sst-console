import { beforeEach, describe, expect, it, vi } from "vitest";

const identityGet = vi.fn();
const identityGetGo = vi.fn();
const userCreate = vi.fn();
const identityCreate = vi.fn();
const userGet = vi.fn();
const userGetGo = vi.fn();
const userByType = vi.fn();
const userByTypeGo = vi.fn();
const userByTypeWhere = vi.fn();
const userDelete = vi.fn();
const identityDelete = vi.fn();
const transactionWrite = vi.fn();
const transactionGo = vi.fn();
const cognitoSend = vi.fn();
const userPatch = vi.fn();
const userPatchSet = vi.fn();
const userPatchGo = vi.fn();
const identityPatch = vi.fn();
const identityPatchSet = vi.fn();

class Command {
	constructor(public input: unknown) {}
}
class UsernameExists extends Error {}

vi.mock("@aws-sdk/client-cognito-identity-provider", () => ({
	AdminCreateUserCommand: Command,
	AdminDeleteUserCommand: Command,
	AdminDisableUserCommand: Command,
	AdminEnableUserCommand: Command,
	AdminGetUserCommand: Command,
	CognitoIdentityProviderClient: class {
		send = cognitoSend;
	},
	InvalidParameterException: class extends Error {},
	InvalidPasswordException: class extends Error {},
	LimitExceededException: class extends Error {},
	UserNotFoundException: class extends Error {},
	UsernameExistsException: UsernameExists
}));

vi.mock("sst", () => ({
	Resource: { SSTConsoleCognitoUserPool: { id: "user-pool" } }
}));

vi.mock("../../src/db", () => ({
	db: {
		entities: {
			user: {
				create: userCreate,
				get: userGet,
				patch: userPatch,
				query: { byType: userByType },
				delete: userDelete
			},
			userIdentity: {
				get: identityGet,
				create: identityCreate,
				patch: identityPatch,
				delete: identityDelete
			}
		},
		transaction: { write: transactionWrite }
	}
}));

const {
	CognitoStatus,
	UserInfoSchema,
	create,
	getIdentity,
	get,
	invite,
	list,
	remove,
	setEnabled
} = await import("../../src/user/user");

const input = {
	cognitoSub: "cognito-sub",
	email: "person@example.com",
	cognitoStatus: "FORCE_CHANGE_PASSWORD" as const,
	cognitoEnabled: true
};
const userId = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
const identity = {
	cognitoSub: input.cognitoSub,
	userId,
	createdAt: "2026-09-26T00:00:00.000Z",
	schemaVersion: "1"
};
const user = {
	id: userId,
	cognitoSub: input.cognitoSub,
	email: input.email,
	cognitoStatus: input.cognitoStatus,
	cognitoEnabled: input.cognitoEnabled,
	createdAt: "2026-09-26T00:00:00.000Z",
	updatedAt: "2026-09-26T00:00:00.000Z"
};

describe("user", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		cognitoSend.mockReset();
		identityGet.mockImplementation(() => ({ go: identityGetGo }));
		userGet.mockImplementation(() => ({ go: userGetGo }));
		userPatch.mockReturnValue({ set: userPatchSet });
		userPatchSet.mockReturnValue({ go: userPatchGo });
		userPatchSet.mockReturnValue({ go: userPatchGo, commit: vi.fn() });
		identityPatch.mockReturnValue({ set: identityPatchSet });
		identityPatchSet.mockReturnValue({ commit: vi.fn() });
		userByType.mockImplementation(() => {
			const query = { go: userByTypeGo, where: userByTypeWhere };
			userByTypeWhere.mockReturnValue(query);
			return query;
		});
		userCreate.mockImplementation(() => ({ commit: vi.fn() }));
		identityCreate.mockImplementation(() => ({ commit: vi.fn() }));
		userDelete.mockImplementation(() => ({ commit: vi.fn() }));
		identityDelete.mockImplementation(() => ({ commit: vi.fn() }));
		transactionWrite.mockImplementation(callback => {
			callback({
				user: {
					create: userCreate,
					delete: userDelete,
					patch: userPatch
				},
				userIdentity: {
					create: identityCreate,
					delete: identityDelete,
					patch: identityPatch
				}
			});
			return { go: transactionGo };
		});
	});

	it("gets user by native ID", async () => {
		userGetGo.mockResolvedValue({ data: user });

		await expect(get({ id: userId })).resolves.toEqual(user);
		expect(userGet).toHaveBeenCalledWith({ id: userId });
	});

	it("validates every Cognito status and rejects unknown values", () => {
		for (const cognitoStatus of CognitoStatus) {
			expect(
				UserInfoSchema.parse({ ...user, cognitoStatus }).cognitoStatus
			).toBe(cognitoStatus);
		}
		expect(() =>
			UserInfoSchema.parse({ ...user, cognitoStatus: "NOT_A_STATUS" })
		).toThrow();
	});

	it("disables Cognito before persisting disabled state", async () => {
		userGetGo.mockResolvedValue({ data: user });
		cognitoSend.mockResolvedValue({});
		userPatchGo.mockResolvedValue({});
		transactionGo.mockResolvedValue({ canceled: false });
		await setEnabled({ id: userId, enabled: false });
		expect(cognitoSend).toHaveBeenCalledWith(
			expect.objectContaining({
				input: { UserPoolId: "user-pool", Username: user.email }
			})
		);
		expect(userPatchSet).toHaveBeenCalledWith(
			expect.objectContaining({ cognitoEnabled: false })
		);
		expect(cognitoSend.mock.invocationCallOrder[0]).toBeLessThan(
			userPatchGo.mock.invocationCallOrder[0]!
		);
	});

	it("lists users by descending ID with pagination", async () => {
		userByTypeGo.mockResolvedValue({
			data: [user],
			cursor: "next-page"
		});

		await expect(list({ limit: 25, cursor: "page" })).resolves.toEqual({
			items: [user],
			meta: { limit: 25, hasMore: true, nextCursor: "next-page" }
		});
		expect(userByType).toHaveBeenCalledWith({});
		expect(userByTypeGo).toHaveBeenCalledWith({
			limit: 25,
			cursor: "page",
			order: "desc"
		});
	});

	it("deletes Cognito user and Console user records", async () => {
		userGetGo.mockResolvedValue({ data: user });
		transactionGo.mockResolvedValue({ canceled: false });

		await remove({ id: userId });

		expect(cognitoSend).toHaveBeenCalledWith(
			expect.objectContaining({
				input: { UserPoolId: "user-pool", Username: input.email }
			})
		);
		expect(userDelete).toHaveBeenCalledWith({ id: userId });
		expect(identityDelete).toHaveBeenCalledWith({
			cognitoSub: input.cognitoSub
		});
	});

	it("invites through Cognito and returns provisioned user ID", async () => {
		cognitoSend.mockResolvedValue({
			User: { Attributes: [{ Name: "sub", Value: input.cognitoSub }] }
		});
		identityGetGo.mockResolvedValue({
			data: identity
		});

		await expect(invite({ email: input.email })).resolves.toEqual({
			id: userId
		});
		expect(cognitoSend).toHaveBeenCalledWith(
			expect.objectContaining({
				input: expect.objectContaining({
					UserPoolId: "user-pool",
					Username: input.email,
					DesiredDeliveryMediums: ["EMAIL"]
				})
			})
		);
	});

	it("resends when an existing Console user still has a pending invitation", async () => {
		cognitoSend
			.mockRejectedValueOnce(new UsernameExists())
			.mockResolvedValueOnce({
				UserStatus: "FORCE_CHANGE_PASSWORD",
				UserAttributes: [{ Name: "sub", Value: input.cognitoSub }]
			})
			.mockResolvedValueOnce({});
		identityGetGo.mockResolvedValue({
			data: identity
		});
		userGetGo.mockResolvedValue({ data: user });
		await expect(invite({ email: input.email })).resolves.toEqual({
			id: userId
		});
		expect(cognitoSend).toHaveBeenLastCalledWith(
			expect.objectContaining({
				input: expect.objectContaining({ MessageAction: "RESEND" })
			})
		);
	});

	it("does not resend an invitation to a confirmed user", async () => {
		cognitoSend
			.mockRejectedValueOnce(new UsernameExists())
			.mockResolvedValueOnce({
				UserStatus: "CONFIRMED",
				UserAttributes: [{ Name: "sub", Value: input.cognitoSub }]
			});
		identityGetGo.mockResolvedValue({
			data: identity
		});
		userGetGo.mockResolvedValue({
			data: { ...user, cognitoStatus: "CONFIRMED" }
		});
		await expect(invite({ email: input.email })).rejects.toMatchObject({
			code: "user.exists"
		});
		expect(cognitoSend).toHaveBeenCalledTimes(2);
	});

	it("never resends when Cognito is confirmed even if Console is stale", async () => {
		cognitoSend
			.mockRejectedValueOnce(new UsernameExists())
			.mockResolvedValueOnce({
				UserStatus: "CONFIRMED",
				UserAttributes: [{ Name: "sub", Value: input.cognitoSub }]
			})
			.mockResolvedValueOnce({});
		identityGetGo.mockResolvedValue({
			data: identity
		});
		userGetGo.mockResolvedValue({ data: user });
		await expect(invite({ email: input.email })).rejects.toMatchObject({
			code: "user.exists"
		});
		expect(cognitoSend).toHaveBeenCalledTimes(2);
	});

	it("resends when Cognito is pending even if Console is confirmed", async () => {
		cognitoSend
			.mockRejectedValueOnce(new UsernameExists())
			.mockResolvedValueOnce({
				UserStatus: "FORCE_CHANGE_PASSWORD",
				UserAttributes: [{ Name: "sub", Value: input.cognitoSub }]
			})
			.mockResolvedValueOnce({});
		identityGetGo.mockResolvedValue({
			data: identity
		});
		userGetGo.mockResolvedValue({
			data: { ...user, cognitoStatus: "CONFIRMED" }
		});
		await expect(invite({ email: input.email })).resolves.toEqual({
			id: userId
		});
		expect(cognitoSend).toHaveBeenLastCalledWith(
			expect.objectContaining({
				input: expect.objectContaining({ MessageAction: "RESEND" })
			})
		);
	});

	it("can retry disabling after Cognito fails", async () => {
		userGetGo.mockResolvedValue({
			data: user
		});
		transactionGo.mockResolvedValue({ canceled: false });
		cognitoSend
			.mockRejectedValueOnce(new Error("Cognito unavailable"))
			.mockResolvedValueOnce({});
		await expect(
			setEnabled({ id: userId, enabled: false })
		).rejects.toThrow();
		expect(userPatch).not.toHaveBeenCalled();
		await expect(
			setEnabled({ id: userId, enabled: false })
		).resolves.toBeUndefined();
		expect(cognitoSend).toHaveBeenCalledTimes(2);
		expect(userPatchSet).toHaveBeenCalledWith(
			expect.objectContaining({ cognitoEnabled: false })
		);
	});

	it("reports a persistence failure after Cognito has been updated", async () => {
		userGetGo.mockResolvedValue({ data: user });
		cognitoSend.mockResolvedValue({});
		userPatchGo.mockRejectedValueOnce(new Error("DynamoDB unavailable"));
		await expect(
			setEnabled({ id: userId, enabled: false })
		).rejects.toThrow("DynamoDB unavailable");
		expect(cognitoSend).toHaveBeenCalledTimes(1);
	});

	it("exchanges a Cognito subject for its native user ID", async () => {
		identityGetGo.mockResolvedValue({
			data: identity
		});

		await expect(
			getIdentity({ cognitoSub: input.cognitoSub })
		).resolves.toEqual(identity);
		expect(identityGet).toHaveBeenCalledWith({
			cognitoSub: input.cognitoSub
		});
	});

	it("resolves identities without an enabled-state projection", async () => {
		identityGetGo.mockResolvedValue({ data: identity });
		await expect(
			getIdentity({ cognitoSub: input.cognitoSub })
		).resolves.toEqual(identity);
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
