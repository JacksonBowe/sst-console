import { afterEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { PublicError } from "@console/core/error";

const mocks = vi.hoisted(() => ({
	getIdentity: vi.fn(),
	get: vi.fn(),
	verifyAccessToken: vi.fn(),
	withActor: vi.fn((_actor, fn: () => unknown) => fn())
}));

vi.mock("@console/core/user", () => ({
	getIdentity: mocks.getIdentity,
	get: mocks.get
}));

vi.mock("@console/core/actor", () => ({
	withActor: mocks.withActor
}));

vi.mock("@console/core/util/jwt", () => ({
	verifyAccessToken: mocks.verifyAccessToken
}));

vi.mock("sst", () => ({
	Resource: {
		SSTConsoleCognitoUserPool: { id: "ap-southeast-2_pool" },
		SSTConsoleCognitoUserPoolClient: { id: "client" }
	}
}));

import { authorize } from "../../src/api/authorizer";

const user = {
	id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
	cognitoSub: "cognito-sub",
	email: "user@example.com",
	cognitoStatus: "CONFIRMED",
	cognitoEnabled: true,
	createdAt: "2026-01-01",
	updatedAt: "2026-01-01"
};

afterEach(() => {
	vi.clearAllMocks();
});

describe("authorizer", () => {
	it("validates Bearer token and binds native user actor", async () => {
		mocks.verifyAccessToken.mockResolvedValue({ sub: "cognito-sub" });
		mocks.getIdentity.mockResolvedValue({ userId: user.id });
		mocks.get.mockResolvedValue(user);
		const app = new Hono();
		app.use("*", authorize);
		app.get("/", c => c.text("ok"));
		app.onError((error, c) =>
			error instanceof PublicError
				? c.json({ code: error.code }, error.status)
				: c.text("error", 500)
		);

		const response = await app.request("/", {
			headers: { Authorization: "Bearer access-token" }
		});

		expect(response.status).toBe(200);
		expect(mocks.verifyAccessToken).toHaveBeenCalledWith({
			token: "access-token",
			poolId: "ap-southeast-2_pool",
			clientId: "client"
		});
		expect(mocks.withActor).toHaveBeenCalledWith(
			{
				type: "user",
				properties: { userId: user.id }
			},
			expect.any(Function)
		);
	});

	it("rejects disabled users with an otherwise valid token", async () => {
		mocks.verifyAccessToken.mockResolvedValue({ sub: "cognito-sub" });
		mocks.getIdentity.mockResolvedValue({ userId: user.id });
		mocks.get.mockResolvedValue({ ...user, cognitoEnabled: false });
		const app = new Hono();
		app.use("*", authorize);
		app.get("/", c => c.text("ok"));
		app.onError((error, c) =>
			error instanceof PublicError
				? c.json({ code: error.code }, error.status)
				: c.text("error", 500)
		);
		const response = await app.request("/", {
			headers: { Authorization: "Bearer access-token" }
		});
		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ code: "user.disabled" });
		expect(mocks.withActor).not.toHaveBeenCalled();
	});
});
