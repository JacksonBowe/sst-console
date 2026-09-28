import { beforeEach, describe, expect, it, vi } from "vitest";

const identityGet = vi.fn();
const identityGetGo = vi.fn();
const userCreate = vi.fn();
const identityCreate = vi.fn();
const userGet = vi.fn();
const userGetGo = vi.fn();
const userById = vi.fn();
const userByIdGo = vi.fn();
const userByIdWhere = vi.fn();
const userDelete = vi.fn();
const identityDelete = vi.fn();
const transactionWrite = vi.fn();
const transactionGo = vi.fn();
const cognitoSend = vi.fn();

class Command {
	constructor(public input: unknown) {}
}

vi.mock("@aws-sdk/client-cognito-identity-provider", () => ({
	AdminCreateUserCommand: Command,
	AdminDeleteUserCommand: Command,
	CognitoIdentityProviderClient: class {
		send = cognitoSend;
	},
	InvalidParameterException: class extends Error {},
	InvalidPasswordException: class extends Error {},
	LimitExceededException: class extends Error {},
	UserNotFoundException: class extends Error {},
	UsernameExistsException: class extends Error {}
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
				query: { byId: userById },
				delete: userDelete
			},
			userIdentity: {
				get: identityGet,
				create: identityCreate,
				delete: identityDelete
			}
		},
		transaction: { write: transactionWrite }
	}
}));

const { create, exchangeCognitoSub, get, invite, list, remove } =
	await import("../../src/user/user");

const input = {
	cognitoSub: "cognito-sub",
	email: "person@example.com",
	cognitoStatus: "FORCE_CHANGE_PASSWORD" as const,
	cognitoEnabled: true
};
const userId = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
const user = {
	id: userId,
	email: input.email,
	cognitoStatus: input.cognitoStatus,
	cognitoEnabled: input.cognitoEnabled,
	createdAt: "2026-09-26T00:00:00.000Z",
	updatedAt: "2026-09-26T00:00:00.000Z"
};

describe("user", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		identityGet.mockImplementation(() => ({ go: identityGetGo }));
		userGet.mockImplementation(() => ({ go: userGetGo }));
		userById.mockImplementation(() => {
			const query = { go: userByIdGo, where: userByIdWhere };
			userByIdWhere.mockReturnValue(query);
			return query;
		});
		userCreate.mockImplementation(() => ({ commit: vi.fn() }));
		identityCreate.mockImplementation(() => ({ commit: vi.fn() }));
		userDelete.mockImplementation(() => ({ commit: vi.fn() }));
		identityDelete.mockImplementation(() => ({ commit: vi.fn() }));
		transactionWrite.mockImplementation(callback => {
			callback({
				user: { create: userCreate, delete: userDelete },
				userIdentity: { create: identityCreate, delete: identityDelete }
			});
			return { go: transactionGo };
		});
	});

	it("gets user by native ID", async () => {
		userGetGo.mockResolvedValue({ data: user });

		await expect(get({ id: userId })).resolves.toEqual(user);
		expect(userGet).toHaveBeenCalledWith({ id: userId });
	});

	it("lists users by descending ID with pagination", async () => {
		userByIdGo.mockResolvedValue({
			data: [user],
			cursor: "next-page"
		});

		await expect(list({ limit: 25, cursor: "page" })).resolves.toEqual({
			items: [user],
			meta: { limit: 25, hasMore: true, nextCursor: "next-page" }
		});
		expect(userById).toHaveBeenCalledWith({});
		expect(userByIdGo).toHaveBeenCalledWith({
			limit: 25,
			cursor: "page",
			order: "desc"
		});
	});

	it("deletes Cognito user and Console user records", async () => {
		userGetGo.mockResolvedValue({ data: { ...input, id: userId } });
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
		identityGetGo.mockResolvedValue({ data: { userId } });

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
